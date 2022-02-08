import cv2
from tensorpack import *
import numpy as np
import os
import pickle
import random


def load_mask(mask_file, shape):
    """
    Args:
        files (list): list of file paths.
        channel (int): 1 or 3. Will convert grayscale to RGB images if channel==3.
            Will produce (h, w, 1) array if channel==1.
        resize (tuple): int or (h, w) tuple. If given, resize the image.
    """
    m = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    box = find_bbx(m)
    m = m[box[0]:box[2], box[1]:box[3]]
    maskj = cv2.resize(m, (shape, shape))
    maskj = np.expand_dims(maskj, axis=-1)

    return maskj[None, :, :, :]

def find_bbx(maskj):

    maskj = np.expand_dims(maskj, axis=-1)
    box = np.array([0, 0, 0, 0])

    # Compute Bbx coordinates
    margin = 3
    xs = np.nonzero(np.sum(maskj, axis=0))[0]
    ys = np.nonzero(np.sum(maskj, axis=1))[0]
    box[1] = xs.min() - margin
    box[3] = xs.max() + margin
    box[0] = 0
    box[2] = maskj.shape[0]

    if box[0] < 0: box[0] = 0
    if box[1] < 0: box[1] = 0

    h = box[2] - box[0]
    w = box[3] - box[1]
    if h < w:
        diff = w - h
        half = int(diff / 2)
        box[0] -= half
        if box[0] < 0:
            box[2] -= box[0]
            box[0] = 0
        else:
            box[2] += diff - half

        if box[2] > maskj.shape[0]:
            box[2] = maskj.shape[0]
    else:
        diff = h - w
        half = int(diff / 2)
        box[1] -= half
        if box[1] < 0:
            box[3] -= box[1]
            box[1] = 0
        else:
            box[3] += diff - half
        if box[3] > maskj.shape[1]:
            box[3] = maskj.shape[1]

    if box[3] == box[1]:
        box[3] += 1
    if box[0] == box[2]:
        box[2] += 1

    return box
