### GaussiGAN - Interactive Flask App

An interactive Flask app for the paper [GaussiGAN: Controllable Image Synthesis with 3D Gaussians from Unposed Silhouettes](https://arxiv.org/abs/2106.13215)

[[Project Page]](https://visual.cs.brown.edu/projects/gaussigan-webpage/) [[Paper]](https://arxiv.org/ftp/arxiv/papers/2106/2106.13215.pdf)  [[Main GitHub]](https://github.com/AlamiMejjati/GaussiGAN)

<img src="docs/interaction_4x.gif" width="800"/>


## Setup

#### Environment

A conda environment YAML (tested on Ubuntu 20.04.3 LTS) is provided. To use it, first run `conda env create -f environment.yml`, then activate it by running `conda activate gaussigan_flask`.

If building your own environment, the following packages must be installed:

- Python 3.7
- Numpy
- TensorFlow 1.15
- Tensorpack
- OpenCV
- Flask
- Pillow

GPU is not a requirement for running the application, and the CPU-only installation of TensorFlow will suffice.

#### Model weights

Model weights can be downloaded from the "Releases" page of this GitHub repo. Place each unzipped directory in `gaussigan_gui/static/models/` without modifying the unzipped directory's name. The app will search this `models/` directory for weights and list them in the "Select model" drop-down list in the GUI.

## Usage

### Starting the Flask app

Within your environment, and from the base directory of the repo, run `flask run`. This will print a message that includes the line:

```
* Running on <URL> (Press CTRL+C to quit)
```

Enter the printed URL into your browser to open the app.

### Interaction

On the left-hand side of the GUI, there are two interaction modes which the user may switch between using the switch button element:

##### "Draw bounding box" mode

- Click and drag on the background image to draw a bounding box.
- Click and drag within a drawn bounding box to translate it.
- Double-click the background image to draw a bounding box that maximally fits the center of the background image.
- Double-click within a drawn bounding box to erase it.

##### "Edit Gaussians" mode

- Click and drag Gaussians to translate them along an xy-plane parallel to the camera plane.
- Hold <kbd>Shift</kbd> while dragging a Gaussian up and down to translate it along the z-axis relative to the camera (i.e., its distance from the camera).
- Hold <kbd>Alt</kbd> or <kbd>Option</kbd> to enable arcball rotation of Gaussians.
- Hold <kbd>1</kbd>, <kbd>2</kbd>, or <kbd>3</kbd> while dragging a Gaussian to modify its scale along its three principle axes respectively. In other words, these modes allow for scaling of the eigenvalues in our eigendecomposition of the Gaussian covariance matrix.

##### Other key press interactions:

- Press <kbd>Enter</kbd> or <kbd>Return</kbd> to generate the mask and texture of the current Gaussian configuration.
