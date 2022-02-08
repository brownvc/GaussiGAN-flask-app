import cv2
from PIL import Image, ImageTk
import io
import tensorflow as tf
from gaussigan_gui.dataloader import load_mask
import numpy as np
import random
import scipy.interpolate as inter
import glob
import os

tf.enable_eager_execution()

m_to_l_model = None
l_to_m_model = None
m_to_t_model = None
gt_masks_dir = None

gt_mask_files = None
cur_gt_mask_file = None

bg_img = None
cur_mask = None

nb_landmarks = None

SHAPE = 256
STYLE_DIM = 8
STYLE_DIM_2 = 8
texture_z = None

# (GT MASK -> LANDMARKS) MODEL
graph_m_to_l = None

# (LANDMARKS -> MASK) MODEL
graph_l_to_m = None

# (MASK -> TEXTURE) MODEL
graph_m_to_t = None

# We access the input and output nodes

# L_TO_M
mu2d_ltm = None
sigma2d_ltm = None
genm = None

# M_TO_L
mask_mtl = None
mu3d_mtl = None
sigma3d_mtl = None
theta3d_mtl = None

# M_TO_T
mask_mtt = None
input_mtt = None
imgcrop_mtt = None
z_mtt = None
genim_mtt = None
mu2d_mtt = None
sigma2d_mtt = None

def load_model(model_dir="gaussigan_gui/static/models/cycle_giraffe_6/"):
    global m_to_l_model, l_to_m_model, m_to_t_model, gt_masks_dir, \
           gt_mask_files, cur_gt_mask_file, nb_landmarks, \
           graph_m_to_l, graph_l_to_m, graph_m_to_t, \
           mu2d_ltm, sigma2d_ltm, genm, mask_mtl, mu3d_mtl, \
           sigma3d_mtl, theta3d_mtl, mask_mtt, input_mtt, imgcrop_mtt, \
           z_mtt, genim_mtt, mu2d_mtt, sigma2d_mtt, texture_z

    m_to_l_model = os.path.join(model_dir, "frozen_model_z_to_l.pb")
    l_to_m_model = os.path.join(model_dir, "frozen_model_l_to_m.pb")
    m_to_t_model = os.path.join(model_dir, "frozen_model_m_to_t.pb")
    gt_masks_dir = os.path.join(model_dir, "masks")

    assert os.path.exists(m_to_l_model), "m_to_l_model does not exist"
    assert os.path.exists(l_to_m_model), "l_to_m_model does not exist"
    assert os.path.exists(m_to_t_model), "m_to_t_model does not exist"

    gt_mask_files = glob.glob(os.path.join(gt_masks_dir, '*.png'))
    cur_gt_mask_file = gt_mask_files[np.random.randint(0, len(gt_mask_files))]

    nb_landmarks = int(model_dir.split("_")[-1].replace("\\", "").replace("/", ""))

    # (GT MASK -> LANDMARKS) MODEL
    with tf.gfile.GFile(m_to_l_model, "rb") as f:
        graph_def = tf.GraphDef()
        graph_def.ParseFromString(f.read())
    with tf.Graph().as_default() as graph_m_to_l:
        tf.import_graph_def(graph_def, name='')

    # (LANDMARKS -> MASK) MODEL
    with tf.gfile.GFile(l_to_m_model, "rb") as f:
        graph_def = tf.GraphDef()
        graph_def.ParseFromString(f.read())
    with tf.Graph().as_default() as graph_l_to_m:
        tf.import_graph_def(graph_def, name='')

    # (MASK -> TEXTURE) MODEL
    with tf.gfile.GFile(m_to_t_model, "rb") as f:
        graph_def = tf.GraphDef()
        a =graph_def.ParseFromString(f.read())
    with tf.Graph().as_default() as graph_m_to_t:
        tf.import_graph_def(graph_def, name='')

    # We access the input and output nodes

    # L_TO_M
    mu2d_ltm = graph_l_to_m.get_tensor_by_name('gen/genlandmarks/mu2d:0')
    sigma2d_ltm = graph_l_to_m.get_tensor_by_name('gen/genlandmarks/sigma2d:0')
    genm = graph_l_to_m.get_tensor_by_name('gen/genmask/convlast/output:0')

    # M_TO_L
    mask_mtl = graph_m_to_l.get_tensor_by_name('mask:0')
    mu3d_mtl = graph_m_to_l.get_tensor_by_name('gen/genlandmarks/mu3d:0')
    sigma3d_mtl = graph_m_to_l.get_tensor_by_name('gen/genlandmarks/sigma3d:0')
    theta3d_mtl = graph_m_to_l.get_tensor_by_name('gen/genlandmarks/theta3d:0')

    # M_TO_T
    mask_mtt = graph_m_to_t.get_tensor_by_name('mask:0')
    input_mtt = graph_m_to_t.get_tensor_by_name('input:0')
    imgcrop_mtt = graph_m_to_t.get_tensor_by_name('preprocess/imgcrop:0')
    z_mtt = graph_m_to_t.get_tensor_by_name('genim/sencim/ztexture:0')
    genim_mtt = graph_m_to_t.get_tensor_by_name('genim/imgen/gen_im:0')
    mu2d_mtt = graph_m_to_t.get_tensor_by_name('gen/genlandmarks/mu2d:0')
    sigma2d_mtt = graph_m_to_t.get_tensor_by_name('gen/genlandmarks/sigma2d:0')

    texture_z = np.random.normal(size=[1, 1, 1, STYLE_DIM])

    return nb_landmarks

def get_bg_image():
    return bg_img.copy()

def update_bg_image(img, canvas_width, canvas_height):
    global bg_img

    scale_factor = min(canvas_width/img.shape[1], canvas_height/img.shape[0])
    bg_img = cv2.resize(img, (int(img.shape[1]*scale_factor), int(img.shape[0]*scale_factor)),
            interpolation=cv2.INTER_CUBIC)

    return bg_img.copy()

def sample_z():
    global texture_z
    texture_z = np.random.normal(size=[1, 1, 1, STYLE_DIM])

def sample_l():
    """
    Generate landmarks from bounding box info.
    """

    global cur_gt_mask_file
    cur_gt_mask_file = gt_mask_files[np.random.randint(0, len(gt_mask_files))]

    np_mask = load_mask(cur_gt_mask_file, SHAPE)

    with tf.Session(
            graph=graph_m_to_l,
            config=tf.ConfigProto(
                gpu_options=tf.GPUOptions(allow_growth=True))) as sess_m_to_l:
        mu3d, sig3d, thet3d = sess_m_to_l.run(
                [mu3d_mtl, sigma3d_mtl, theta3d_mtl],
                feed_dict={mask_mtl: np_mask})
        sess_m_to_l.close()

    thet3d_rads = thet3d.flatten()[0] * np.pi / 180.

    return mu3d[0], sig3d[0], thet3d_rads

def generate_mask(mu2d, sigma2d):
    """
    Run mask generation.
    """

    with tf.Session(graph=graph_l_to_m, config=tf.ConfigProto(\
            gpu_options=tf.GPUOptions(allow_growth=True))) as sess_l_to_m:

        m_final = sess_l_to_m.run(genm, feed_dict={mu2d_ltm: mu2d, sigma2d_ltm:sigma2d})
        m_final = (np.squeeze((m_final + 1) * 0.5 * 255)).astype(np.uint8)
        sess_l_to_m.close()

    global cur_mask
    cur_mask = m_final

    return m_final

def generate_texture(bbx_region, mu2d, sigma2d):
    template = bg_img[
        bbx_region[1]:bbx_region[1] + bbx_region[3],
        bbx_region[0]:bbx_region[0] + bbx_region[2]
    ]
    template = cv2.resize(template, cur_mask.shape)
    bin_mask = cur_mask / 255.
    img_crop = (template / 127.5 - 1.0) * (1 - bin_mask[:, :, None]) - bin_mask[:, :, None]

    template = template[None, :, :, :]
    img_crop = img_crop[None, :, :, :]

    with tf.Session(graph=graph_m_to_t,
                    config=tf.ConfigProto(gpu_options=tf.GPUOptions(allow_growth=True))) as sess_m_to_t:
        tex_square = sess_m_to_t.run(genim_mtt, feed_dict={mu2d_mtt: mu2d,
                                                         sigma2d_mtt: sigma2d,
                                                         z_mtt: texture_z,
                                                         imgcrop_mtt: img_crop,
                                                         mask_mtt: cur_mask[None, :, :, None],
                                                         input_mtt: template})
        sess_m_to_t.close()

    tex_square = (tex_square + 1) * 0.5
    tex_square = (np.squeeze(tex_square * 255)).astype(np.uint8)

    tex_square = cv2.resize(tex_square, (bbx_region[2], bbx_region[3]), interpolation=cv2.INTER_CUBIC)

    im_final = bg_img.copy()
    im_final[bbx_region[1]:bbx_region[1] + bbx_region[3],
             bbx_region[0]:bbx_region[0] + bbx_region[2]] = tex_square

    
    return im_final

def generate_mask_and_texture(bbx_region, mu2d, sigma2d):
    mask = generate_mask(mu2d, sigma2d)
    texture = generate_texture(bbx_region, mu2d, sigma2d)

    return mask, texture

def generate_all(bbx_region):

    mu3d, sigma3d, theta3d = sample_l()
    mu2d, sigma2d = get_landmarks(
            mu3d.astype(np.float64)[None, ...],
            sigma3d.astype(np.float64)[None, ...], 
            0., theta3d * 180 / np.pi, 0., 0., 0., -2.)

    mask = generate_mask(mu2d.numpy(), sigma2d.numpy())
    texture = generate_texture(bbx_region, mu2d.numpy(), sigma2d.numpy())

    return mu3d, sigma3d, theta3d, mask, texture


def get_landmarks(mus, sigma, rotx, roty, rotz, tx, ty, tz, focal=1.):
    assert mus is not None
    assert sigma is not None
    count = 4
    rotXval = np.array([[rotx]], dtype=np.float32)
    rotYval = np.array([[roty]], dtype=np.float32)
    rotZval = np.array([[rotz]], dtype=np.float32)
    rotX = rotXval * np.pi / 180
    rotY = rotYval * np.pi / 180
    rotZ = rotZval * np.pi / 180
    zr = tf.zeros_like(rotYval)
    ons = tf.ones_like(rotYval)

    RX = tf.stack([tf.stack([ons, zr, zr], axis=-1), tf.stack([zr, tf.cos(rotX), -tf.sin(rotX)], axis=-1),
                   tf.stack([zr, tf.sin(rotX), tf.cos(rotX)], axis=-1)], axis=-1)
    RY = tf.stack([tf.stack([tf.cos(rotY), zr, tf.sin(rotY)], axis=-1), tf.stack([zr, ons, zr], axis=-1),
                   tf.stack([-tf.sin(rotY), zr, tf.cos(rotY)], axis=-1)], axis=-1)
    RZ = tf.stack([tf.stack([tf.cos(rotZ), -tf.sin(rotZ), zr], axis=-1),
                   tf.stack([tf.sin(rotZ), tf.cos(rotZ), zr], axis=-1),
                   tf.stack([zr, zr, ons], axis=-1)], axis=-1)

    # Composed rotation matrix with (RX,RY,RZ)
    R = tf.matmul(tf.matmul(RX, RY), RZ)

    transvec = tf.constant(np.array([[tx, ty, tz]]), dtype=tf.float64)
    transvec = tf.stack([transvec] * nb_landmarks, axis=1)
    transvec = transvec[:, :, tf.newaxis, :]


    px = tf.zeros([tf.shape(mus)[0], nb_landmarks])
    py = tf.zeros([tf.shape(mus)[0], nb_landmarks])
    fvs = tf.ones_like(px) * focal
    zv = tf.zeros_like(px)
    ov = tf.ones_like(px)
    K = tf.stack([tf.stack([fvs, zv, zv], axis=-1), tf.stack([zv, fvs, zv], axis=-1),
                  tf.stack([px, py, ov], axis=-1)], axis=-1)
    K = tf.cast(K, tf.float64)
    K = tf.identity(K, name='K')

    R = tf.cast(R, tf.float64) * tf.ones_like(sigma)
    sigma = tf.linalg.matmul(tf.linalg.matmul(R, sigma), R, transpose_b=True)
    invsigma = tf.linalg.inv(sigma)
    mus = tf.cast(mus, tf.float64)
    mus = tf.transpose(tf.linalg.matmul(R, tf.transpose(mus, [0, 1, 3, 2])), [0, 1, 3, 2]) + transvec

    M0 = tf.matmul(invsigma, tf.matmul(mus, mus, transpose_a=True))
    M0 = tf.matmul(M0, invsigma, transpose_b=True)
    M1 = (tf.matmul(tf.matmul(mus, invsigma), mus, transpose_b=True) - 1)
    M1 = M1 * invsigma

    M = M0 - M1

    Mtmp = tf.constant(np.array([[1, 1, 0], [1, 1, 0], [0, 0, 1]]), dtype=tf.float64)
    M = -M + 2 * M * Mtmp[tf.newaxis, tf.newaxis, :, :]
    M33 = tf.gather(tf.gather(M, [0, 1], axis=2), [0, 1], axis=3)
    K33 = tf.gather(tf.gather(K, [0, 1], axis=2), [0, 1], axis=3)
    M31 = tf.gather(tf.gather(M, [0, 1], axis=2), [1, 2], axis=3)
    M23 = tf.gather(tf.gather(M, [0, 2], axis=2), [0, 1], axis=3)
    det_m31 = tf.linalg.det(M31)
    det_m23 = tf.linalg.det(M23)
    det_m33 = tf.linalg.det(M33)
    det_m = tf.linalg.det(M)

    mup0 = tf.squeeze(tf.matmul(K33, tf.stack([det_m31, -det_m23], axis=-1)\
            [:, :, :, tf.newaxis]), axis=-1) / det_m33[:, :, tf.newaxis]
    mup1 = tf.stack([K[:, :, 0, 2], K[:, :, 1, 2]], axis=-1)
    mup = mup0 + mup1

    sigma_w = det_m / det_m33
    sigma_w = sigma_w[:, :, None, None]
    invm33 = tf.linalg.inv(M33)
    sigmap = -sigma_w * invm33

    gauss_xy_list = []
    mup = tf.cast(mup, tf.float32)
    sigmap = tf.cast(sigmap, tf.float32)
    mup = tf.identity(mup, name='mu2d')
    sigmap = tf.identity(sigmap, name='sigma2d')

    return mup, sigmap

def get_gaussian_maps_2d(mu, sigma, shape_hw, mode='rot'):
    """
    Generates [B,SHAPE_H,SHAPE_W,NMAPS] tensor of 2D gaussians,
    given the gaussian centers: MU [B, NMAPS, 2] tensor.

    STD: is the fixed standard dev.
    """
    with tf.name_scope(None, 'gauss_map', [mu]):
        y = tf.to_float(tf.linspace(-1.0, 1.0, shape_hw[0]))

        x = tf.to_float(tf.linspace(-1.0, 1.0, shape_hw[1]))
        [x,y] = tf.meshgrid(x,y)
        xy = tf.stack([x, y], axis=-1)
        xy = tf.stack([xy] * nb_landmarks, axis=0)
        xy = xy[tf.newaxis, : ,:, :, :]
        mu = mu[:,:,tf.newaxis, tf.newaxis,:]
        invsigma = tf.linalg.inv(sigma)
        invsigma = tf.cast(invsigma, tf.float32)
        pp = tf.tile(invsigma[:, :, tf.newaxis, :, :], [1, 1, shape_hw[1], 1, 1])
        X = xy-mu
        dist = tf.matmul(X,pp)
        dist = tf.reduce_sum((dist*X), axis=-1)

        g_yx = tf.exp(-dist)

        g_yx = tf.transpose(g_yx, perm=[0, 2, 3, 1])

    return g_yx
