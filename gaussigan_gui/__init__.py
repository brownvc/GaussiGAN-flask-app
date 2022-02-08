"""
Initialization for Flask app.
"""

import time
import os
import glob

import numpy as np
from flask import Flask, render_template, request, jsonify, \
        redirect, url_for, send_from_directory
from PIL import Image
import gaussigan_gui.model_runner as model_runner
import base64
from io import BytesIO
import cv2

app = Flask(__name__)

@app.route('/')
def main():
    """
    Setup the webpage.
    """

    img_shape = 256
    bg_img_path = "../static/defaults/bg.jpg"
    bg_img = model_runner.bg_img
    if bg_img is None:
      bg_img = np.array(Image.open("gaussigan_gui/static/defaults/bg.jpg"))
      bg_img = model_runner.update_bg_image(bg_img, 500, 400)
    bg_img_width = bg_img.shape[1]
    bg_img_height = bg_img.shape[0]
    model_list = glob.glob("gaussigan_gui/static/models/*/")

    num_gaussians = model_runner.nb_landmarks
    if num_gaussians is None:
      num_gaussians = model_runner.load_model(model_list[0])

    for i, model in enumerate(model_list):
        model_list[i] = model.split("/")[-2]

    model_list_string = "["
    for i, model in enumerate(model_list):
        model_list_string += "\""
        model_list_string += model
        model_list_string += "\""
        if i != len(model_list) - 1:
            model_list_string += ", "
    model_list_string += "]"

    return render_template(
        'interactive.html.jinja',
        img_shape=img_shape,
        bg_img_height=str(bg_img_height),
        bg_img_width=str(bg_img_width),
        bg_img_path=bg_img_path,
        num_gaussians=num_gaussians,
        model_list=model_list)


@app.route('/api/run_gaussians', methods=['POST'])
def run_gaussians():
    """
    Sample Gaussian landmark parameters.
    """

    mu3d, sigma3d, theta3d = model_runner.sample_l()

    return jsonify({
        "mu3d": mu3d.tolist(),
        "sigma3d": sigma3d.tolist(),
        "theta3d": theta3d
    })


@app.route('/api/run_mask', methods=['POST'])
def run_mask():
    """
    Run generative model to create mask image.
    """

    request_content = request.get_json()
    mu2d = np.array(request_content["gaussian_mu2ds"])
    sigma2d = np.array(request_content["gaussian_sigma2ds"])
    mask = model_runner.generate_mask(mu2d, sigma2d)
    return jsonify({"mask_img": encode_img(mask)});


@app.route('/api/sample_z', methods=['POST'])
def sample_z():
    """
    Run generative model to create texture image.
    """

    request_content = request.get_json()
    bbx_region = np.array(request_content["bbx_region"])
    mu2d = np.array(request_content["gaussian_mu2ds"])
    sigma2d = np.array(request_content["gaussian_sigma2ds"])

    model_runner.sample_z()

    texture_img = model_runner.generate_texture(
            bbx_region, mu2d, sigma2d)

    return jsonify({"texture_img": encode_img(texture_img)})


@app.route('/api/run_texture', methods=['POST'])
def run_texture():
    """
    Run generative model to create texture image.
    """

    request_content = request.get_json()
    bbx_region = np.array(request_content["bbx_region"])
    mu2d = np.array(request_content["gaussian_mu2ds"])
    sigma2d = np.array(request_content["gaussian_sigma2ds"])

    texture_img = model_runner.generate_texture(
            bbx_region, mu2d, sigma2d)

    return jsonify({"texture_img": encode_img(texture_img)})


@app.route('/api/run_mask_and_texture', methods=['POST'])
def run_mask_and_texture():
    """
    Run generative models to create mask and texture images.
    """

    request_content = request.get_json()
    bbx_region = np.array(request_content["bbx_region"])
    mu2d = np.array(request_content["gaussian_mu2ds"])
    sigma2d = np.array(request_content["gaussian_sigma2ds"])

    mask, texture = \
        model_runner.generate_mask_and_texture(bbx_region, mu2d, sigma2d)

    return jsonify({
        "mask_img": encode_img(mask),
        "texture_img": encode_img(texture)
    })

@app.route('/api/run_all', methods=['POST'])
def run_all():
    """
    Sample Gaussians and generate mask/texture images.
    """

    request_content = request.get_json()
    bbx_region = np.array(request_content["bbx_region"])

    return_vals = model_runner.generate_all(bbx_region)

    return jsonify({
        "mu3d": return_vals[0].tolist(),
        "sigma3d": return_vals[1].tolist(),
        "theta3d": return_vals[2],
        "mask_img": encode_img(return_vals[3]),
        "texture_img": encode_img(return_vals[4])
    })

@app.route('/api/update_bg', methods=['POST'])
def update_bg():
    image_file = request.files['bg_file'].read()
    np_file = np.fromstring(image_file, np.uint8)
    img = cv2.imdecode(np_file, cv2.IMREAD_COLOR)
    img = img[..., ::-1]

    resized_img = model_runner.update_bg_image(img, 500, 400)

    return jsonify({"resized_img": encode_img(resized_img)})

@app.route('/api/get_bg', methods=['GET'])
def get_bg():
    return jsonify({"bg_img": encode_img(model_runner.get_bg_image())})

@app.route('/api/load_model', methods=['POST'])
def load_model():
    model_name = request.get_json()['model_name']

    model_path = os.path.join("gaussigan_gui/static/models/", model_name)
    if os.path.isdir(model_path):
        num_gaussians = model_runner.load_model("gaussigan_gui/static/models/" + model_name)
    else:
        return jsonify({"successful": False})

    return jsonify({"successful": True, "num_gaussians": num_gaussians})

@app.route('/display/<filename>', methods=['GET'])
def display_image(filename):
    return redirect(url_for('static', filename=filename), code=301)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'defaults/favicon.ico')


def encode_img(img):
    """
    Encode numpy image to base64.
    """

    if np.max(img) <= 1.:
        img *= 255.
    gauss_maps_img = Image.fromarray(img.astype(np.uint8))
    buffer = BytesIO()
    gauss_maps_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')
