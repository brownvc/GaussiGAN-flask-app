/**
 * =======================================
 * BOUNDING BOX INTERACTION
 * =======================================
 */


 var bg_img_canvas = document.querySelector("#bg-image"),
 bg_img_context = bg_img_canvas.getContext("2d"),
 bg_img = new Image(),
 texture_canvas = document.getElementById("texture"),
 texture_context = texture_canvas.getContext("2d"),
 mask_canvas = document.querySelector("#mask"),
 mask_context = mask_canvas.getContext("2d"),
 mask_img = new Image();


function bgImageOnLoad() {
 bbx = {};
 drawBg();
 updateBgDimensions();
}

function updateBgDimensions() {
 texture_canvas.width = bg_img_canvas.width;
 texture_canvas.height = bg_img_canvas.height;
 var loading_div = document.querySelector("#output-frame .loader-container");
 loading_div.style.width = String(bg_img_canvas.width) + "px";
 loading_div.style.height = String(bg_img_canvas.height) + "px";
 var bg_inner_frame = document.getElementById("bg-inner-frame");
 bg_inner_frame.style.width = String(bg_img_canvas.width) + "px";
 bg_inner_frame.style.height = String(bg_img_canvas.height) + "px";
 var output_inner_frame = document.getElementById("output-inner-frame");
 output_inner_frame.style.width = String(bg_img_canvas.width) + "px";
 output_inner_frame.style.height = String(bg_img_canvas.height) + "px";
}

function fetchBg() {
 fetch("/api/get_bg").then(function (response) {
     return response.json();
 }).then(function(json_response) {
     if (json_response) {
         var rgb_img_base64 = json_response.bg_img;
         bg_img.src = "data:image/png;base64," + rgb_img_base64;
         bg_img.onload = bgImageOnLoad;
     } else {
         var input_label = document.getElementById("bg-img-upload-label");
         input_label.innerText = "ERROR. Please try again.";
     }
 });
}

fetchBg();

var bbx = {
 start_x: null,
 start_y: null,
 h: null,
 w: null,
};
var bbx_mode = null; // can be null, "draw", or "move"

function initBgInteraction() {
 bg_img_canvas.addEventListener('mousedown', bbxMouseDown, false);
 bg_img_canvas.addEventListener('mouseup', bbxMouseUp, false);
 bg_img_canvas.addEventListener('mousemove', bbxMouseMove, false);
 bg_img_canvas.addEventListener('dblclick', bbxDblClick, false);
}

var startRotate = false;

function rotationInteraction(){
 var rotation_switch_input = document.getElementById("rotation-switch-input");
 var rotation_switch_label = document.getElementById("rotation-switch-label");

 if(rotation_switch_input.checked){
     rotation_switch_label.innerText = "Rotation On";
     startRotate = true;
 }else{
     rotation_switch_label.innerText = "Rotation Off";
     startRotate = false;
 }

}

function switchBgInteraction() {
 var bg_switch_input = document.getElementById("bg-switch-input");

 var bg_switch_label = document.getElementById("bg-switch-label");
 var gauss_frame =  document.getElementById("gaussians-frame");


 if (bg_switch_input.checked) {
     bg_switch_label.innerText = "Edit Gaussians";
     bg_img_canvas.style.pointerEvents = "none";
     gauss_frame.style.pointerEvents = "auto";

     if(startRotate == true){
         drawRotate();
     }else{
     drawBg();

     }
 } else {
     bg_switch_label.innerText = "Draw bounding box";
     bg_img_canvas.style.pointerEvents = "auto";
     gauss_frame.style.pointerEvents = "none";
     if(startRotate == true){
         drawRotate();
     }else{
     drawBg();

     }
 }
}

document.getElementById("bg-switch-input").addEventListener("change", switchBgInteraction, false);

// document.getElementById("rotation-switch-input").addEventListener("change", rotationInteraction, false);

document.oncontextmenu = function(e){
var evt = new Object({keyCode:93});
stopEvent(e);
}

function stopEvent(event){
if(event.preventDefault != undefined)
event.preventDefault();
if(event.stopPropagation != undefined)
event.stopPropagation();
}


function switchMaskInteraction() {
 var mask_switch_input = document.getElementById("mask-switch-input");
 var mask_switch_label = document.getElementById("mask-switch-label");
 var mask_frame =  document.getElementById("mask-frame");
 if (mask_switch_input.checked) {
     mask_switch_label.innerText = "Show mask";
     mask_frame.style.display = "inline-block";
 } else {
     mask_switch_label.innerText = "Hide mask";
     mask_frame.style.display = "none";
 }
}

document.getElementById("mask-switch-input").addEventListener("change", switchMaskInteraction, false);

function inBbx(e) {
 if (bbx.start_x == null || bbx.start_y == null || bbx.w == null || bbx.h == null) {
     return false;
 }

 var bounds_x = [
     Math.min(bbx.start_x, bbx.start_x + bbx.w),
     Math.max(bbx.start_x, bbx.start_x + bbx.w)
 ];
 var bounds_y = [
     Math.min(bbx.start_y, bbx.start_y + bbx.h),
     Math.max(bbx.start_y, bbx.start_y + bbx.h)
 ];

 if (e.offsetX < bounds_x[0] || e.offsetX > bounds_x[1]) {
     return false;
 }
 if (e.offsetY < bounds_y[0] || e.offsetY > bounds_y[1]) {
     return false;
 }
 return true;
}


function bbxMouseDown(e) {

 if(e.which != 1){
     startRotate = true;
 }

 if(e.which == 1){
     startRotate = false;
 }

 
 if (inBbx(e)) {
     bbx.mouse_down_x = e.offsetX;
     bbx.mouse_down_y = e.offsetY;
     bbx_mode = "move";
 } else {
     bbx.w = 0;
     bbx.h = 0;
     bbx.start_x = e.offsetX;
     bbx.start_y = e.offsetY;
     bbx_mode = "draw";

     let gauss_frame = document.getElementById("gaussians-frame");
     gauss_frame.style.display = "block";
 }

 if(startRotate == false){
     drawBg();
 }else{
     drawRotate();
 }
}

var newMove = 1;
var per_start_x = 0;
var per_start_y = 0;


function bbxMouseUp() {

 newMove = 1;

 bbx_mode = null;
 if (bbx.w < 0) {
     bbx.start_x = bbx.start_x + bbx.w;
     bbx.w = -bbx.w;
 }
 if (bbx.h < 0) {
     bbx.start_y = bbx.start_y + bbx.h;
     bbx.h = -bbx.h;
 }

 // Clamp to image boundaries
 if (bbx.start_x < 0) {
     bbx.start_x = 0;
 }
 if (bbx.start_y < 0) {
     bbx.start_y = 0;
 }
 if (bbx.start_x + bbx.w >= bg_img_canvas.width) {
     bbx.start_x = bg_img_canvas.width - bbx.w;
 }
 if (bbx.start_y + bbx.h >= bg_img_canvas.height) {
     bbx.start_y = bg_img_canvas.height - bbx.h;
 }

 if(startRotate == false){
     drawBg();
 }else{
     drawRotate();
 }
}

function bbxMouseMove(e) {
 
 if (bbx_mode == "draw") {
     var bbx_dx = e.offsetX - bbx.start_x;
     var bbx_dy = e.offsetY - bbx.start_y;
     let bbx_size = math.max(math.abs([bbx_dx, bbx_dy]));
     if (bbx_dx >= 0) {
         bbx.w = bbx_size;
     } else {
         bbx.w = -bbx_size;
     }

     if (bbx_dy >= 0) {
         bbx.h = bbx_size;
     } else {
         bbx.h = -bbx_size;
     }
     drawBg();
 } else if (bbx_mode == "move" && startRotate == true) {

     if(newMove == 1){
         pos_start_x = (e.offsetX-250.)/250.0;
         pos_start_y = (170. - e.offsetY)/170.0;
         newMove = 0;
     }

     
     pos_this_x = (e.offsetX-250.)/250.0;
     pos_this_y = (170. - e.offsetY)/170.0;

     var pos_start_z = 0.0;
     var pos_this_z = 0.0

     if(pos_start_x*pos_start_x - pos_start_y*pos_start_y < 1){
          pos_start_z = Math.sqrt(1 - pos_start_x*pos_start_x - pos_start_y*pos_start_y);
     }

     if(pos_this_x*pos_this_x - pos_this_y*pos_this_y < 1){
          pos_this_z = Math.sqrt(1 - pos_this_x*pos_this_x - pos_this_y*pos_this_y);
     }

     var xAngle = (pos_start_x - pos_this_x) * 6.28;
     var yAngle = (pos_start_y - pos_this_y) * 3.14;

//      console.log("pos_start_x - pos_this_x", pos_start_x - pos_this_x);
//      console.log("pos_start_y - pos_this_y", pos_start_y - pos_this_y);
     



     //Now we have p(x,y,z) and p'(x',y',z')
     var P = new Vec3 (pos_start_x, pos_start_y, pos_start_z);
     
     var Pdash = new Vec3 (pos_this_x, pos_this_y, pos_this_z);
  //   console.log("start position in xyz",pos_start_x, pos_start_y, pos_start_z);
  //   console.log("this position in xyz",pos_this_x, pos_this_y, pos_this_z);

     //Find P dot P'
     var PdotPdash = P.x * Pdash.x + P.y * Pdash.y + P.y * Pdash.y;
     

     //Find theta
     var Angletheta =  math.acos(PdotPdash/ 1.0); 

     //Find P cross P'
     var u = Vec3.create().asCross(P, Pdash);
     var u_norm = math.norm([u.x,u.y,u.z]);

     pos_u_x = u.x/u_norm;
     pos_u_y = u.y/u_norm;
     pos_u_z = u.z/u_norm;

//     console.log("this attributes, ux, uy, uz, theta: ",
//     pos_u_x, pos_u_y, pos_u_z, Angletheta);

     pos_this_theta = Angletheta;

     pos_sin_theta = xAngle;
     pos_cos_theta = yAngle;

 //    console.log("pos_sin_theta", pos_sin_theta);
 //    console.log("pos_cos_theta", pos_cos_theta);

     bbx.start_x += e.offsetX - bbx.mouse_down_x;
     bbx.start_y += e.offsetY - bbx.mouse_down_y;
     bbx.mouse_down_x = e.offsetX;
     bbx.mouse_down_y = e.offsetY;
     drawRotate();


 } else if(bbx_mode == "move" && startRotate == false){
//     console.log("can't rotate");
     per_start_x = bbx.start_x;
     per_start_y = bbx.start_y;

     bbx.start_x += e.offsetX - bbx.mouse_down_x;
     bbx.start_y += e.offsetY - bbx.mouse_down_y;
     bbx.mouse_down_x = e.offsetX;
     bbx.mouse_down_y = e.offsetY;
     drawBg();

 }else if (inBbx(e)) {
     bg_img_canvas.style.cursor = "move"; 
 } else {
     bg_img_canvas.style.cursor = "crosshair"; 
 }

}

//Vec3 pacakage
function Vec3(x, y, z) {
this.x = x != null ? x : 0;
this.y = y != null ? y : 0;
this.z = z != null ? z : 0;
}

Vec3.create = function(x, y, z) {
return new Vec3(x, y, z);
};

Vec3.prototype.asCross = function(a, b) {
return this.copy(a).cross(b);
};

Vec3.prototype.copy = function(v) {
this.x = v.x;
this.y = v.y;
this.z = v.z;
return this;
};

Vec3.prototype.cross = function(v) {
var x = this.x;
var y = this.y;
var z = this.z;
var vx = v.x;
var vy = v.y;
var vz = v.z;
this.x = y * vz - z * vy;
this.y = z * vx - x * vz;
this.z = x * vy - y * vx;
return this;
};


function bbxDblClick(e) {
 if (bbx.w && inBbx(e)) {
     // Double click inside bbx removes bbx
     bbx = {}
     var gauss_frame = document.getElementById("gaussians-frame");
     gauss_frame.style.display = "none";
     bg_img_canvas.style.cursor = "crosshair"; 

 } else {
     // Double click outside bbx fits bbx to bg
     if (bg_img_canvas.width == bg_img_canvas.height) {
         bbx.start_x = 0;
         bbx.start_y = 0;
         bbx.w = bg_img_canvas.width;
         bbx.h = bg_img_canvas.height;
     } else {
         if (bg_img_canvas.width > bg_img_canvas.height) {
             bbx.w = bg_img_canvas.height;
             bbx.h = bg_img_canvas.height;
             bbx.start_x = Math.max(Math.round((bg_img_canvas.width - bbx.w) / 2), 0);
             bbx.start_y = 0;
         } else {
             bbx.w = bg_img_canvas.width;
             bbx.h = bg_img_canvas.width;
             bbx.start_x = 0;
             bbx.start_y = Math.max(math.round((bg_img_canvas.height - bbx.h) / 2), 0);
         }
     }

     if (inBbx(e)) {
         bg_img_canvas.style.cursor = "move"; 
     } else {
         bg_img_canvas.style.cursor = "crosshair"; 
     }
 }

 drawBg();
}

function drawRotate() {
//    console.log("drawRotate");

  bg_img_context.clearRect(0,0,bg_img_canvas.width,bg_img_canvas.height);

 bg_img_canvas.width = bg_img.width;
 bg_img_canvas.height = bg_img.height;
 bg_img_context.drawImage(bg_img, 0, 0);

 // If a bounding box has been drawn
 if (bbx.w) {
     bg_img_context.lineWidth = 4;
     bg_img_context.strokeStyle = "#000000";
     bg_img_context.strokeRect(per_start_x, per_start_y, bbx.w, bbx.h);
 }

 let gauss_frame = document.getElementById("gaussians-frame");

 // Change gaussian editor dimensions
 gauss_frame.style.left = String(Math.min(per_start_x, per_start_x + bbx.w)) + "px";
 gauss_frame.style.top = String(Math.min(per_start_y, per_start_y + bbx.h)) + "px";
 gauss_frame.style.width = String(Math.abs(bbx.w)) + "px";
 gauss_frame.style.height = String(Math.abs(bbx.h)) + "px";

 var loading_div = document.querySelector("#gaussians-frame .loader-container");
 loading_div.style.width = gauss_frame.style.width;
 loading_div.style.height = gauss_frame.style.height;

 gaussians_canvas.width = Math.abs(bbx.w);
 gaussians_canvas.height = Math.abs(bbx.h);

 calculateProjection();

}


function drawBg() {
//  alert("hi");
 bg_img_context.clearRect(0,0,bg_img_canvas.width,bg_img_canvas.height);

 bg_img_canvas.width = bg_img.width;
 bg_img_canvas.height = bg_img.height;
 bg_img_context.drawImage(bg_img, 0, 0);

 // If a bounding box has been drawn
 if (bbx.w) {
     bg_img_context.lineWidth = 4;
     bg_img_context.strokeStyle = "#000000";
     bg_img_context.strokeRect(bbx.start_x, bbx.start_y, bbx.w, bbx.h);
 }

 let gauss_frame = document.getElementById("gaussians-frame");

 // Change gaussian editor dimensions
 gauss_frame.style.left = String(Math.min(bbx.start_x, bbx.start_x + bbx.w)) + "px";
 gauss_frame.style.top = String(Math.min(bbx.start_y, bbx.start_y + bbx.h)) + "px";
 gauss_frame.style.width = String(Math.abs(bbx.w)) + "px";
 gauss_frame.style.height = String(Math.abs(bbx.h)) + "px";

 var loading_div = document.querySelector("#gaussians-frame .loader-container");
 loading_div.style.width = gauss_frame.style.width;
 loading_div.style.height = gauss_frame.style.height;

 gaussians_canvas.width = Math.abs(bbx.w);
 gaussians_canvas.height = Math.abs(bbx.h);

 // Update mask image
 mask_canvas.width = Math.abs(bbx.w);
 mask_canvas.height = Math.abs(bbx.h);

 let mask_frame = document.getElementById("mask-frame");
 mask_frame.style.left = String(Math.min(bbx.start_x, bbx.start_x + bbx.w)) + "px";
 mask_frame.style.top = String(Math.min(bbx.start_y, bbx.start_y + bbx.h)) + "px";
 mask_frame.style.width = String(Math.abs(bbx.w)) + "px";
 mask_frame.style.height = String(Math.abs(bbx.h)) + "px";

 drawMask();

 calculateProjection();
}

function drawMask() {
 mask_context.drawImage(mask_img, 0, 0, mask_canvas.width, mask_canvas.height);

 if (mask_canvas.width > 0) {
     var im_data = mask_context.getImageData(0, 0, mask_canvas.width, mask_canvas.height);

     // Non-white pixels -> transparent
     var data = im_data.data;
     for (var i = 0; i < data.length; i += 4) {
         data[i + 3] = 150;
     }
     mask_context.putImageData(im_data, 0, 0);
 }
}

initBgInteraction();

// Theta-range slider interaction

function updateTheta(new_theta) {
 camera_y = new_theta;

 // Round to one decimal place since 0.1 is the step size
//   document.getElementById("theta-range").value = Math.round(new_theta * 1800.0 / Math.PI) / 10.0;
//    document.getElementById("theta-num").value = Math.round(new_theta * 1800.0 / Math.PI) / 10.0;
 calculateProjection();
}


// BG image upload
var bg_upload_input = document.getElementById("bg-img-upload");
bg_upload_input.addEventListener("change", function(e) {
 var bg_file = bg_upload_input.files[0];
 var form_data = new FormData();
 form_data.append("bg_file", bg_file);

 var input_label = document.getElementById("bg-img-upload-label");
 input_label.innerText = "Uploading...";

 fetch("/api/update_bg", {
     method: 'POST',
     body: form_data
 }).then(function (response) {
     return response.json();
 }).then(function(json_response) {
     if (json_response) {
         var input_label = document.getElementById("bg-img-upload-label");
         input_label.innerText = bg_upload_input.value.split("\\").pop();

         var rgb_img_base64 = json_response.resized_img;
         bg_img.src = "data:image/png;base64," + rgb_img_base64;
         bg_img.onload = bgImageOnLoad;
     } else {
         var input_label = document.getElementById("bg-img-upload-label");
         input_label.innerText = "ERROR. Please try again.";
     }
 });

}, false);



/**
* =======================================
* GAUSSIANS INTERACTION
* =======================================
*/

var gaussians_canvas = document.querySelector("#gaussians");
var gaussians = null;

const interact_modes = {
 TRANS_XY:  "trans_xy",
 TRANS_Z:   "trans_z",
 ROT:       "rot",
 SCALE_X:   "scale_x",
 SCALE_Y:   "scale_y",
 SCALE_Z:   "scale_z"
};

var cur_interact_mode = interact_modes.ROT;

function initGaussians() {
 gaussians = d3.range(num_gaussians).map(i => ({
     // 3D gaussian parameters:
     mu3d: [0,0,0],
     sigma3d: [[0,0,0],[0,0,0],[0,0,0]],
     sigma3d_rot: [[0,0,0],[0,0,0],[0,0,0]],
     sigma3d_scale: [[0,0,0],[0,0,0],[0,0,0]],
     // 2D gaussian parameters:
     mu2d: [0,0],
     sigma2d: [[0,0],[0,0]],
     // Interactive transformations parameters:
     pix_x: 0,
     pix_y: 0,
     arcball_op1: [0, 0, 0],
     arcball_op2: [0, 0, 0],
     // Graphical parameters:
     color: [0,0,0],
     active: false
 }));

 initGaussianColors();
}

initGaussians();

var camera_y = 0;
var pos_start_x = 0;
var pos_start_y = 0;
var pos_this_x = 0;
var pos_this_y = 0;

var pos_u_x = 0;
var pos_u_y = 0;
var pos_u_z = 0;
var pos_this_theta = 0;

var pos_sin_theta = 0;
var pos_cos_theta = 0;




function initGaussianColors(pastel_factor=0.5) {

 var gaussian_colors = [];

 function color_distance(color_1, color_2) {
     var accumulator = 0;
     for (c = 0; c < 3; c++) {
         accumulator += Math.abs(color_2[c] - color_1[c]);
     }
     return accumulator;
 }

 for (var g_idx = 0; g_idx < num_gaussians; g_idx++) {

     var max_distance = null
     var best_color = null

     for (var i = 0; i < 100; i++) {
         var rand_color = [0, 0, 0];

         for (var c = 0; c < 3; c++) {
             var rand_val = Math.random();
             rand_color[c] = (rand_val + pastel_factor) / (1.0 + pastel_factor);
         }

         if (gaussian_colors.length == 0) {
             best_color = rand_color;
             break;
         } else {
             var cur_min_distance = Infinity;

             // Find distance of rand_color to closest color in existing gaussian_colors list
             for (var c2 = 0; c2 < gaussian_colors.length; c2++) {
                 var cur_dist = color_distance(gaussian_colors[c2], rand_color);
                 if (cur_dist < cur_min_distance) {
                     cur_min_distance = cur_dist;
                 }
             }

             if (max_distance < cur_min_distance || max_distance == null) {
                 best_color = rand_color;
                 max_distance = cur_min_distance;
             }
         }
     }

     gaussian_colors.push(best_color);
     gaussians[g_idx].color = best_color;
 }
}

// Translate pixel coordinate to [-1, 1]x[-1, 1] space
function pixelToGaussianSpace(x, y) {
 var x_prime = (2 * (x / gaussians_canvas.width)) - 1;
 var y_prime = (2 * (y / gaussians_canvas.height)) - 1;

 return [x_prime, y_prime]
}

// Translate coordinate in gaussian space to pixel coordinate
function gaussianToPixelSpace(x_prime, y_prime) {
 var x = ((x_prime + 1) / 2) * gaussians_canvas.width;
 var y = ((y_prime + 1) / 2) * gaussians_canvas.height;

 return [x, y]
}

function calcArcballVector(x, y) {
 var arc_vec = [x, y, 1.0];
 var arc_sqr = (x * x) + (y * y);
 if (arc_sqr <= 1.0) {
     arc_vec[2] = Math.sqrt(1.0 - arc_sqr);
 } else {
     arc_vec = math.divide(arc_vec, math.norm(arc_vec));
 }

 // Rotate arcball vec to match camera rotation
 arc_vec = math.multiply(arc_vec, math.rotationMatrix(camera_y, [0., 1., 0.]));

 return arc_vec;
}

function drag() {
 // Choose the circle that is closest to the pointer for dragging.
 function closestSubject() {
     let subject = null;
     let distance = Infinity;
     for (const g of gaussians) {
         let d = Math.hypot(d3.mouse(this)[0] - g.pix_x, d3.mouse(this)[1] - g.pix_y);
         if (d < distance) {
             distance = d;
             subject = g;
         }
     }
     return subject;
 }

 function dragStarted() {
     d3.event.subject.active = true;
     if (cur_interact_mode == interact_modes.ROT) {
         var mouse_down_pix = d3.mouse(gaussians_canvas);
         var mouse_down_camera = pixelToGaussianSpace(mouse_down_pix[0], mouse_down_pix[1]);
         var mouse_down_obj = math.subtract(d3.event.subject.mu2d, mouse_down_camera);

         d3.event.subject.arcball_op1 = calcArcballVector(mouse_down_obj[0], mouse_down_obj[1]);
     }
 }
 function dragging() {
     let cur_width = gaussians_canvas.width;
     let cur_height = gaussians_canvas.height;

     let scaled_dx = 3.7 * d3.event.dx / cur_width;
     let scaled_dy = 3.7 * d3.event.dy / cur_height;

     switch(cur_interact_mode) {
         case interact_modes.TRANS_XY:
             d3.event.subject.mu3d[0] += scaled_dx * Math.cos(camera_y);
             d3.event.subject.mu3d[2] -= scaled_dx * Math.sin(camera_y);
             d3.event.subject.mu3d[1] += scaled_dy;
             break;
         case interact_modes.TRANS_Z:
             d3.event.subject.mu3d[0] += scaled_dy * Math.sin(camera_y);
             d3.event.subject.mu3d[2] += scaled_dy * Math.cos(camera_y);
             break;
         case interact_modes.ROT:
             var mouse_drag_pix = d3.mouse(gaussians_canvas);
             var mouse_drag_camera = pixelToGaussianSpace(mouse_drag_pix[0], mouse_drag_pix[1]);
             var mouse_drag_obj = math.subtract(d3.event.subject.mu2d, mouse_drag_camera);

             d3.event.subject.arcball_op2 = calcArcballVector(mouse_drag_obj[0], mouse_drag_obj[1]);

             var arcball_dot = math.dot(d3.event.subject.arcball_op1, d3.event.subject.arcball_op2);
             var arcball_theta = math.acos(math.min(1.0, arcball_dot));
             var arcball_rot_vec = math.cross(
                 d3.event.subject.arcball_op1, d3.event.subject.arcball_op2);
             // No rotations around zero vector
             if (math.sum(arcball_rot_vec) == 0) {
                 break;
             }

             var arcball_rot_mat = math.rotationMatrix(arcball_theta, arcball_rot_vec);
             d3.event.subject.sigma3d_rot = math.multiply(d3.event.subject.sigma3d_rot, arcball_rot_mat);
             d3.event.subject.arcball_op1 = math.mean([d3.event.subject.arcball_op1, d3.event.subject.arcball_op2], 0);
             break;

         case interact_modes.SCALE_X:
             var lamb1 = d3.event.subject.sigma3d_scale[0][0];
             d3.event.subject.sigma3d_scale[0][0] = math.max(lamb1 - 0.005 * d3.event.dy, 0.001);
             break;
         case interact_modes.SCALE_Y:
             var lamb2 = d3.event.subject.sigma3d_scale[1][1];
             d3.event.subject.sigma3d_scale[1][1] = math.max(lamb2 - 0.005 * d3.event.dy, 0.001);
             break;
         case interact_modes.SCALE_Z:
             var lamb3 = d3.event.subject.sigma3d_scale[2][2];
             d3.event.subject.sigma3d_scale[2][2] = math.max(lamb3 - 0.005 * d3.event.dy, 0.001);
             break;
     }

     calculateProjection();
 }

 function dragended() {
     d3.event.subject.active = false;
 }

 return d3.drag()
     .subject(closestSubject)
     .on("start", dragStarted)
     .on("drag", dragging)
     .on("end", dragended)
};

d3.selectAll("#gaussians").call(drag());

var gl = gaussians_canvas.getContext("webgl2");

function createGaussianProjectionProgram() {
 if (gl == null) {
     alert("WEBGL2 COULD NOT BE ENABLED");
     return;
 }


 // Projection occurs here:
 var vert_shader_code = `#version 300 es

     precision highp float;

     // INPUTS:
     in float ndc_x_point_location;
     in vec3 mu3d;
     in vec3 sigma3d1;
     in vec3 sigma3d2;
     in vec3 sigma3d3;

     uniform float roty; // Camera y rotation in radians

     uniform float u_x;
     uniform float u_y;
     uniform float u_z;
     uniform float thistheta;

     uniform float sinTheta;
     uniform float cosTheta;

  //   console.log("u_x", u_x);


     const float translate_z = -2.0;
     const float focal = 1.0;
     
     // OUTPUTS:
     out vec2 mu2d;
     out mat2 sigma2d;

     void main() {
         mat3 sigma3d = mat3(sigma3d1, sigma3d2, sigma3d3);

         // Camera rotation matrix (only y-axis rotation needed)
/*
         mat3 roty_mat = mat3(
           u_x*u_x + (1.0- u_x*u_x)*cosTheta,     u_x*u_y*(1.0-cosTheta)-u_z*sinTheta,     u_x*u_z*(1.0-cosTheta)+u_y*sinTheta,
             u_y*u_x*(1.0-cosTheta)+u_z*sinTheta,     u_y*u_y+(1.0-u_y*u_y)*cosTheta,     u_y*u_z*(1.0-cosTheta)-u_x*sinTheta,
             u_z*u_x*(1.0-cosTheta) - u_y*sinTheta,         u_z*u_y*(1.0-cosTheta)+u_x*sinTheta,     u_z*u_z + (1.0- u_z*u_z)*cosTheta 
         );
         */

         mat3 roty_mat_x = mat3(
             1,   0,   0,
             0,           cos(cosTheta ),   -sin(cosTheta ),
             0,  sin(cosTheta),   cos(cosTheta)
         );

         mat3 roty_mat_y = mat3(
             cos(sinTheta),   0,   sin(sinTheta),
             0,           1,   0,
             -sin(sinTheta),  0,   cos(sinTheta)
         );
/*
         mat3 roty_mat_z = mat3(
             cos(roty),   -sin(roty),   0,
             sin(roty),           cos(roty),   0,
             0,  0,   1
         );
*/
         // Intrinsic camera params
         mat3 K = mat3(
             focal,     0,     0,
             0,     focal,     0,
             0,         0,     1
         );

         mat3 roty_mat = roty_mat_x * roty_mat_y;
         
         vec3 trans_mu3d = (roty_mat * mu3d) + vec3(0, 0, translate_z);
         mat3 rot_sigma3d = roty_mat * sigma3d * transpose(roty_mat);
         mat3 inv_sigma3d = inverse(rot_sigma3d);

         // Calcualte M matrix
         // mat3 M0 = (inv_sigma3d * dot(trans_mu3d, trans_mu3d)) * transpose(inv_sigma3d);
         
         mat3 M_inner = mat3(
             trans_mu3d.x * trans_mu3d,
             trans_mu3d.y * trans_mu3d,
             trans_mu3d.z * trans_mu3d
         );
         mat3 M0 = (inv_sigma3d * M_inner) * transpose(inv_sigma3d);
         mat3 M1 = (dot((trans_mu3d * inv_sigma3d), trans_mu3d) - 1.0) * inv_sigma3d;
         mat3 M = M0 - M1;

         // Aij is a matrix A with i-th row and j-th column removed
         mat2 M33 = mat2(M[0].xy, M[1].xy);
         mat2 M31 = mat2(M[1].xy, M[2].xy);
         mat2 M23 = mat2(M[0].xz, M[1].xz);
         float M33_det = determinant(M33);

         mat2 K33 = mat2(K[0].xy, K[1].xy);

         mu2d = ((1.0 / M33_det) * K33 * vec2(determinant(M31), -determinant(M23))) + K[2].xy;
         mu2d = -mu2d;

         // sigma2d = (((-determinant(M) / M33_det) * K33) * inverse(M33)) * transpose(K33);
         sigma2d = (-determinant(M) / M33_det) * inverse(M33);

         // Pixel that will be written to
         gl_Position = vec4(ndc_x_point_location, 0.0, 0.0, 1.0);
         gl_PointSize = 1.0;
     }
 `;

 var vert_shader = gl.createShader(gl.VERTEX_SHADER);
 gl.shaderSource(vert_shader, vert_shader_code);
 gl.compileShader(vert_shader);
 var shader_info = gl.getShaderInfoLog(vert_shader);
 if (shader_info) {
     console.log(shader_info);
 }

 var frag_shader_code = `#version 300 es

     precision highp float;
     in vec2 mu2d;
     in mat2 sigma2d;

     layout(location = 0) out vec4 mu_out;
     layout(location = 1) out vec4 sigma_out;

     void main() {
         mu_out = vec4(mu2d, 0.0, 0.0);
         sigma_out = vec4(sigma2d[0][0], sigma2d[1][1], sigma2d[0][1], 0.0);
     }
 `;

 var frag_shader = gl.createShader(gl.FRAGMENT_SHADER);
 gl.shaderSource(frag_shader, frag_shader_code);
 gl.compileShader(frag_shader);
 shader_info = gl.getShaderInfoLog(frag_shader);
 if (shader_info) {
     console.log(shader_info);
 }

 var prgm = gl.createProgram();
 gl.attachShader(prgm, vert_shader);
 gl.attachShader(prgm, frag_shader);
 gl.linkProgram(prgm);
 var prgm_info = gl.getProgramInfoLog(prgm);
 if (prgm_info) {
     console.log(prgm_info);
 }

 return prgm;
}

var gaussProjectionProgram = createGaussianProjectionProgram();

// Gets pixel x-coordinate in normalized device coordinates
function getGaussianNDCLocationX(gaussian_idx, width) {
 return gaussian_idx * (2.0 / width) - .9
}

function calculateProjection() {

 gl.useProgram(gaussProjectionProgram);
 const ext = gl.getExtension("EXT_color_buffer_float");

 
 gl.viewport(0, 0, num_gaussians, 1);

 var full_mu3d = [];
 var full_sigma3d1 = [];
 var full_sigma3d2 = [];
 var full_sigma3d3 = [];
 for (var i = 0; i < num_gaussians; i++) {
     full_mu3d.push(gaussians[i].mu3d);
     
     var temp_sig = math.multiply(
         gaussians[i].sigma3d_rot,
         math.multiply(gaussians[i].sigma3d_scale,
             math.transpose(gaussians[i].sigma3d_rot))
     );

     full_sigma3d1.push(
         temp_sig[0][0],
         temp_sig[1][0],
         temp_sig[2][0]
     );
     full_sigma3d2.push(
         temp_sig[0][1],
         temp_sig[1][1],
         temp_sig[2][1]
     );
     full_sigma3d3.push(
         temp_sig[0][2],
         temp_sig[1][2],
         temp_sig[2][2]
     );
 }
 
 var mu3d_flat = math.flatten(full_mu3d);
 var sigma3d1_flat = math.flatten(full_sigma3d1);
 var sigma3d2_flat = math.flatten(full_sigma3d2);
 var sigma3d3_flat = math.flatten(full_sigma3d3);

 // Calculate NDC coordinates for data pixels
 var ndc_x_point_locations = [];
 for (var i = 0; i < num_gaussians; i++) {
     ndc_x_point_locations.push(getGaussianNDCLocationX(i, num_gaussians));
 }

 // Pixel point locations attribute
 var ndc_x_point_buffer = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, ndc_x_point_buffer);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ndc_x_point_locations), gl.STATIC_DRAW);
 var ndc_loc = gl.getAttribLocation(gaussProjectionProgram, "ndc_x_point_location");

 var vao = gl.createVertexArray();
 gl.bindVertexArray(vao);

 gl.enableVertexAttribArray(ndc_loc);
 gl.vertexAttribPointer(ndc_loc, 1, gl.FLOAT, false, 0, 0);
 var err = gl.getError();
 if (err) {
     console.log("ENABLE VERTEX ATTRIB ERROR:");
     console.log(err);
 }


 // mu3d attribute
 var mu3d_buffer = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, mu3d_buffer);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mu3d_flat), gl.STATIC_DRAW);
 var mu3d_loc = gl.getAttribLocation(gaussProjectionProgram, "mu3d");
 gl.vertexAttribPointer(mu3d_loc, 3, gl.FLOAT, false, 0, 0);
 gl.enableVertexAttribArray(mu3d_loc);
 err = gl.getError();
 if (err) {
     console.log("ENABLE VERTEX ATTRIB ERROR:");
     console.log(err);
 }

 // sigma3d1 attribute
 var sigma3d1_buffer = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, sigma3d1_buffer);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sigma3d1_flat), gl.STATIC_DRAW);
 var sigma3d1_loc = gl.getAttribLocation(gaussProjectionProgram, "sigma3d1");
 gl.vertexAttribPointer(sigma3d1_loc, 3, gl.FLOAT, false, 0, 0);
 gl.enableVertexAttribArray(sigma3d1_loc);
 err = gl.getError();
 if (err) {
     console.log("ENABLE VERTEX ATTRIB ERROR:");
     console.log(err);
 }
 
 // sigma3d2 attribute
 var sigma3d2_buffer = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, sigma3d2_buffer);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sigma3d2_flat), gl.STATIC_DRAW);
 var sigma3d2_loc = gl.getAttribLocation(gaussProjectionProgram, "sigma3d2");
 gl.vertexAttribPointer(sigma3d2_loc, 3, gl.FLOAT, false, 0, 0);
 gl.enableVertexAttribArray(sigma3d2_loc);
 err = gl.getError();
 if (err) {
     console.log("ENABLE VERTEX ATTRIB ERROR:");
     console.log(err);
 }

 // sigma3d3 attribute
 var sigma3d3_buffer = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, sigma3d3_buffer);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sigma3d3_flat), gl.STATIC_DRAW);
 var sigma3d3_loc = gl.getAttribLocation(gaussProjectionProgram, "sigma3d3");
 gl.vertexAttribPointer(sigma3d3_loc, 3, gl.FLOAT, false, 0, 0);
 gl.enableVertexAttribArray(sigma3d3_loc);
 err = gl.getError();
 if (err) {
     console.log("ENABLE VERTEX ATTRIB ERROR:");
     console.log(err);
 }


 // Camera y rotation uniform
var rot_y_attrib = gl.getUniformLocation(gaussProjectionProgram, "roty");
 gl.uniform1f(rot_y_attrib, camera_y);

 var u_x_attrib = gl.getUniformLocation(gaussProjectionProgram, "u_x");
 gl.uniform1f(u_x_attrib, pos_u_x);

 var u_y_attrib = gl.getUniformLocation(gaussProjectionProgram, "u_y");
 gl.uniform1f(u_y_attrib, pos_u_y);

 var u_z_attrib = gl.getUniformLocation(gaussProjectionProgram, "u_z");
 gl.uniform1f(u_z_attrib, pos_u_z);

 var thistheta_attrib = gl.getUniformLocation(gaussProjectionProgram, "thistheta");
 gl.uniform1f(thistheta_attrib, pos_this_theta);

 var sinTheta_attrib = gl.getUniformLocation(gaussProjectionProgram, "sinTheta");
 gl.uniform1f(sinTheta_attrib, pos_sin_theta);

 var cosTheta_attrib = gl.getUniformLocation(gaussProjectionProgram, "cosTheta");
 gl.uniform1f(cosTheta_attrib, pos_cos_theta);

 // Setup framebuffer for multiple render targets
 var textures = [];
 var framebuf = gl.createFramebuffer();
 gl.bindFramebuffer(gl.FRAMEBUFFER, framebuf);
 for (var i = 0; i < 2; i++) {
     var tex = gl.createTexture();
     textures.push(tex);
     gl.bindTexture(gl.TEXTURE_2D, tex);

     var pixels = new Float32Array(num_gaussians * 4);
     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, num_gaussians, 1, 0, 
                   gl.RGBA, gl.FLOAT, pixels);

     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i,
                             gl.TEXTURE_2D, tex, 0);
 }

 gl.enable(gl.DEPTH_TEST);
 gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
 gl.drawArrays(gl.POINT, 0, num_gaussians);
 gl.bindBuffer(gl.ARRAY_BUFFER, null);

 gl.bindFramebuffer(gl.FRAMEBUFFER, framebuf)

 var mu_data = new Float32Array(num_gaussians * 4);
 gl.readBuffer(gl.COLOR_ATTACHMENT0);
 gl.readPixels(0, 0, num_gaussians, 1, gl.RGBA, gl.FLOAT, mu_data);

 var sigma_data = new Float32Array(num_gaussians * 4);
 gl.readBuffer(gl.COLOR_ATTACHMENT1);
 gl.readPixels(0, 0, num_gaussians, 1, gl.RGBA, gl.FLOAT, sigma_data);

 for (var i = 0; i < num_gaussians; i++) {
     gaussians[i].mu2d[0] = mu_data[i*4];
     gaussians[i].mu2d[1] = mu_data[i*4 + 1];
     gaussians[i].sigma2d[0][0] = sigma_data[i*4];
     gaussians[i].sigma2d[1][1] = sigma_data[i*4 + 1];
     gaussians[i].sigma2d[0][1] = sigma_data[i*4 + 2];
     gaussians[i].sigma2d[1][0] = sigma_data[i*4 + 2];
     var pix_array  = gaussianToPixelSpace(
         gaussians[i].mu2d[0], gaussians[i].mu2d[1]);
     gaussians[i].pix_x = pix_array[0];
     gaussians[i].pix_y = pix_array[1];
 }

 gl.bindFramebuffer(gl.FRAMEBUFFER, null);

 render();
}

function argMax(array) {
return [].map.call(array, (x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}


function create2DGaussianDrawProgram() {
 if (gl == null) {
     alert("WEBGL2 COULD NOT BE ENABLED");
     return;
 }

 var vert_shader_code = `#version 300 es
     in vec2 vertexPositionNDC;
     void main() {
         gl_Position = vec4(vertexPositionNDC, 0.0, 1.0);
     }
 `;

 var vert_shader = gl.createShader(gl.VERTEX_SHADER);
 gl.shaderSource(vert_shader, vert_shader_code);
 gl.compileShader(vert_shader);
 var vert_shader_log = gl.getShaderInfoLog(vert_shader);
 if (vert_shader_log) {
     console.log(vert_shader_log);
 }

 var frag_shader_code = `#version 300 es
     precision mediump float;

     uniform float colors[${num_gaussians * 3}];
     uniform float mu_xs[${num_gaussians}];
     uniform float mu_ys[${num_gaussians}];
     uniform float sigma_xs[${num_gaussians}];
     uniform float sigma_ys[${num_gaussians}];
     uniform float covs[${num_gaussians}];
     uniform vec2 cur_resolution;

     const float M_PI = 3.141592653;

     layout (location=0) out vec4 out_color;

     void main() {
         vec3 max_color = vec3(0, 0, 0);

         vec2 loc = (2.0 * gl_FragCoord.xy / cur_resolution.xy) - vec2(1.0, 1.0);
         loc.y = -loc.y;

         for (int i = 0; i < ${num_gaussians}; i++) {
             float x_var = sigma_xs[i] * sigma_xs[i];
             float y_var = sigma_ys[i] * sigma_ys[i];
             float cov = covs[i];

             vec2 mu = vec2(mu_xs[i], mu_ys[i]);

             mat2 cov_inv = mat2(
                 y_var, -cov,
                 -cov, x_var
             );
             cov_inv = cov_inv / ((x_var * y_var) - (cov * cov));

             vec2 loc_mu = loc - mu;
             float exp_term = dot(loc_mu, cov_inv * loc_mu);
             exp_term = exp(-exp_term);

             vec3 cur_color = vec3(
                 colors[i*3] * exp_term,
                 colors[i*3 + 1] * exp_term,
                 colors[i*3 + 2] * exp_term
             );

             max_color.r = max(max_color.r, cur_color.r);
             max_color.g = max(max_color.g, cur_color.g);
             max_color.b = max(max_color.b, cur_color.b);
         }

         float out_opacity = (max_color.r + max_color.g + max_color.b) / 3.;

         if (out_opacity >= 0.001) {
             out_opacity = log(out_opacity) + 2.5;
             out_opacity = min(1.0, out_opacity);
         }

         out_color = vec4(max_color, out_opacity);
     }
 `;

 var frag_shader = gl.createShader(gl.FRAGMENT_SHADER);
 gl.shaderSource(frag_shader, frag_shader_code);
 gl.compileShader(frag_shader);
 var frag_shader_log = gl.getShaderInfoLog(frag_shader);
 if (frag_shader_log) {
     console.log(frag_shader_log);
 }

 var prgm = gl.createProgram();
 gl.attachShader(prgm, vert_shader);
 gl.attachShader(prgm, frag_shader);
 gl.linkProgram(prgm);

 var prgm_log = gl.getProgramInfoLog(prgm);
 if (prgm_log) {
     console.log(prgm_log);
 }

 return prgm;
}

var gauss2DDrawProgram = create2DGaussianDrawProgram();

function render() {
 gl.useProgram(gauss2DDrawProgram);

 var gaussian_colors = [];
 var gaussian_mu_xs = [];
 var gaussian_mu_ys = [];
 var gaussian_sigma_xs = [];
 var gaussian_sigma_ys = [];
 var gaussian_covs = [];

 for (var i = 0; i < num_gaussians; i++) {
     gaussian_colors = gaussian_colors.concat(gaussians[i].color);
     gaussian_mu_xs = gaussian_mu_xs.concat(gaussians[i].mu2d[0]);
     gaussian_mu_ys = gaussian_mu_ys.concat(gaussians[i].mu2d[1]);
     gaussian_sigma_xs = gaussian_sigma_xs.concat(Math.sqrt(gaussians[i].sigma2d[0][0]));
     gaussian_sigma_ys = gaussian_sigma_ys.concat(Math.sqrt(gaussians[i].sigma2d[1][1]));
     gaussian_covs = gaussian_covs.concat(gaussians[i].sigma2d[0][1]);
 }

 if (gl == null) {
     alert("WEBGL2 COULD NOT BE ENABLED");
     return;
 }

 var quadVerts = [
      1.0,  1.0,
     -1.0,  1.0,
     -1.0, -1.0,
     -1.0, -1.0,
      1.0, -1.0,
      1.0,  1.0
 ];

 var quadVertsBuffer = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, quadVertsBuffer);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
 var coord = gl.getAttribLocation(gauss2DDrawProgram, "vertexPositionNDC");
 gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
 gl.enableVertexAttribArray(coord);

 var uColors = gl.getUniformLocation(gauss2DDrawProgram, "colors");
 gl.uniform1fv(uColors, new Float32Array(gaussian_colors));
 var uMuXs = gl.getUniformLocation(gauss2DDrawProgram, "mu_xs");
 gl.uniform1fv(uMuXs, new Float32Array(gaussian_mu_xs));
 var uMuYs = gl.getUniformLocation(gauss2DDrawProgram, "mu_ys");
 gl.uniform1fv(uMuYs, new Float32Array(gaussian_mu_ys));
 var uSigmaXs = gl.getUniformLocation(gauss2DDrawProgram, "sigma_xs");
 gl.uniform1fv(uSigmaXs, new Float32Array(gaussian_sigma_xs));
 var uSigmaYs = gl.getUniformLocation(gauss2DDrawProgram, "sigma_ys");
 gl.uniform1fv(uSigmaYs, new Float32Array(gaussian_sigma_ys));
 var uCovs = gl.getUniformLocation(gauss2DDrawProgram, "covs");
 gl.uniform1fv(uCovs, new Float32Array(gaussian_covs));
 var uCurResolution = gl.getUniformLocation(gauss2DDrawProgram, "cur_resolution");
 gl.uniform2fv(uCurResolution, new Float32Array([gaussians_canvas.width, gaussians_canvas.height]));

 gl.enable(gl.DEPTH_TEST);
 gl.viewport(0, 0, gaussians_canvas.width, gaussians_canvas.height);

 gl.clearColor(0, 0, 0, 0);

 gl.drawArrays(gl.TRIANGLES, 0, 6);
 gl.bindBuffer(gl.ARRAY_BUFFER, null);
}


/**
* =======================================
* UI CONTROLS AND MODEL INTERACTION
* =======================================
*/


// Key bindings
d3.select("body").on("keydown", function() {
 // SHIFT
 if (d3.event.keyCode == 16) {
     cur_interact_mode = interact_modes.TRANS_Z;
 // OPTION
 } else if (d3.event.keyCode == 18) {
     cur_interact_mode = interact_modes.ROT;
 // 1 key
 } else if (d3.event.keyCode == 49) {
     cur_interact_mode = interact_modes.SCALE_X;
 // 2 key
 } else if (d3.event.keyCode == 50) {
     cur_interact_mode = interact_modes.SCALE_Y;
 // 3 key
 } else if (d3.event.keyCode == 51) {
     cur_interact_mode = interact_modes.SCALE_Z;
 }
});
d3.select("body").on("keyup", function() {
 // SHIFT or OPTION
 if (d3.event.keyCode == 16 ||
     d3.event.keyCode == 18 ||
     d3.event.keyCode == 49 ||
     d3.event.keyCode == 50 ||
     d3.event.keyCode == 51) {
     cur_interact_mode = interact_modes.TRANS_XY;
 }
});
d3.select("body").on("keypress", function() {
 // ENTER
 if (d3.event.keyCode == 13) {
     fetchMaskAndTexture();
 }
});

// Button bindings
d3.select("#gen-gaussians-button").on("click", function() {
 fetchLandmarks();
});
d3.select("#gen-mask-button").on("click", function() {
 fetchMask();
});
d3.select("#sample-z-button").on("click", function() {
 fetchZ();
});
d3.select("#gen-texture-button").on("click", function() {
 fetchTexture();
});
d3.select("#gen-mask-and-texture-button").on("click", function() {
 fetchMaskAndTexture();
});
d3.select("#gen-all-button").on("click", function() {
 fetchAll();
});



async function fetchLandmarks(fetch_mask=false) {
 var generation_info = getGenerationInfo();
 var loader_divs = document.querySelectorAll("#gaussians-frame .loader-container");
 setLoading(loader_divs);

 let response = await fetch("/api/run_gaussians", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(generation_info)
 });

 var json_response = await response.json();

 // Update gaussian parameters
 var mu3d_temp = json_response.mu3d;
 var sigma3d_temp = json_response.sigma3d;

 for (var i = 0; i < num_gaussians; i++) {
     gaussians[i].mu3d = math.flatten(mu3d_temp[i]);
     gaussians[i].sigma3d = sigma3d_temp[i];

     var eig_ret = math.eigs(gaussians[i].sigma3d);
     var temp_diag = [[eig_ret.values[0], 0, 0], [0, eig_ret.values[1], 0], [0, 0, eig_ret.values[2]]];
     gaussians[i].sigma3d_rot = eig_ret.vectors;
     gaussians[i].sigma3d_scale = temp_diag;
 }

 camera_y = json_response.theta3d;

//   updateTheta(camera_y);
 calculateProjection();
 endLoading(loader_divs);

 if (fetch_mask) {
     fetchMask();
 }
}

async function fetchMask() {
 var loader_divs = document.querySelectorAll("#output-frame .loader-container");
 setLoading(loader_divs);

 var generation_info = getGenerationInfo();

 var response = await fetch("/api/run_mask", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(generation_info)
 });

 var json_response = await response.json();
 var mask_img_base64 = json_response.mask_img;
 mask_img = new Image();
 mask_img.src = "data:image/png;base64," + mask_img_base64;
 mask_img.onload = function(){
     drawMask();
     endLoading(loader_divs);
 };
}

async function fetchZ() {
 if (!bbx.w) {
     alert("Select a bounding box before running texture generation.");
     return;
 }

 var loader_divs = document.querySelectorAll("#output-frame .loader-container");
 setLoading(loader_divs);

 var generation_info = getGenerationInfo();

 var response = await fetch("/api/sample_z", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(generation_info)
 });

 var json_response = await response.json();
 var texture_img_base64 = json_response.texture_img;
 var tex_gen_img = new Image();
 tex_gen_img.src = "data:image/png;base64," + texture_img_base64;
 tex_gen_img.onload = function(){
     texture_context.drawImage(tex_gen_img, 0, 0);
     endLoading(loader_divs);
 };
}

async function fetchTexture() {
 if (!bbx.w) {
     alert("Select a bounding box before running texture generation.");
     return;
 }

 var loader_divs = document.querySelectorAll("#output-frame .loader-container");
 setLoading(loader_divs);

 var generation_info = getGenerationInfo();

 var response = await fetch("/api/run_texture", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(generation_info)
 });

 var json_response = await response.json();
 var texture_img_base64 = json_response.texture_img;
 var tex_gen_img = new Image();
 tex_gen_img.src = "data:image/png;base64," + texture_img_base64;
 tex_gen_img.onload = function(){
     texture_context.drawImage(tex_gen_img, 0, 0);
     endLoading(loader_divs);
 };
}

async function fetchMaskAndTexture() {
 if (!bbx.w) {
     alert("Select a bounding box before running texture generation.");
     return;
 }

 var loader_divs = document.querySelectorAll("#output-frame .loader-container");
 setLoading(loader_divs);

 var generation_info = getGenerationInfo();

 var response = await fetch("/api/run_mask_and_texture", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(generation_info)
 });

 var json_response = await response.json();

 var mask_img_base64 = json_response.mask_img;
 mask_img = new Image();
 mask_img.src = "data:image/png;base64," + mask_img_base64;
 mask_img.onload = function(){
     drawMask();
 };

 var texture_img_base64 = json_response.texture_img;
 var tex_gen_img = new Image();
 tex_gen_img.src = "data:image/png;base64," + texture_img_base64;
 tex_gen_img.onload = function(){
     texture_context.drawImage(tex_gen_img, 0, 0);
     endLoading(loader_divs);
 };
}

async function fetchAll() {
 if (!bbx.w) {
     alert("Select a bounding box before running texture generation.");
     return;
 }

 var loader_divs = document.querySelectorAll(
     "#output-frame .loader-container, " +
     "#gaussians-frame .loader-container"
 );
 setLoading(loader_divs);

 var generation_info = getGenerationInfo();

 var response = await fetch("/api/run_all", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(generation_info)
 });

 var json_response = await response.json();

 // Update gaussian parameters
 var mu3d_temp = json_response.mu3d;
 var sigma3d_temp = json_response.sigma3d;

 for (var i = 0; i < num_gaussians; i++) {
     gaussians[i].mu3d = math.flatten(mu3d_temp[i]);
     gaussians[i].sigma3d = sigma3d_temp[i];

     var eig_ret = math.eigs(gaussians[i].sigma3d);
     var temp_diag = [[eig_ret.values[0], 0, 0], [0, eig_ret.values[1], 0], [0, 0, eig_ret.values[2]]];
     gaussians[i].sigma3d_rot = eig_ret.vectors;
     gaussians[i].sigma3d_scale = temp_diag;
 }

 camera_y = json_response.theta3d;

//   updateTheta(camera_y);
 calculateProjection();
 endLoading(document.querySelectorAll("#gaussians-frame .loader-container"));

 var mask_img_base64 = json_response.mask_img;
 mask_img = new Image();
 mask_img.src = "data:image/png;base64," + mask_img_base64;
 mask_img.onload = function(){
     drawMask();
 };

 var texture_img_base64 = json_response.texture_img;
 var tex_gen_img = new Image();
 tex_gen_img.src = "data:image/png;base64," + texture_img_base64;
 tex_gen_img.onload = function(){
     texture_context.drawImage(tex_gen_img, 0, 0);
     endLoading(document.querySelectorAll("#output-frame .loader-container"));
 };
}

function setLoading(loader_divs) {
 for (var i = 0; i < loader_divs.length; i++) {
     let cur_width = parseInt(loader_divs[i].style.width);
     let loader_width = Math.round(cur_width / 6.);
     loader_divs[i].childNodes[1].style.width = String(loader_width) + "px";
     loader_divs[i].childNodes[1].style.height = String(loader_width) + "px";
     loader_divs[i].style.display = "flex";
 }
}

function endLoading(loader_divs) {
 for (var i = 0; i < loader_divs.length; i++) {
     loader_divs[i].style.display = "none";
 }
}

function getGenerationInfo() {
 var gaussian_mu2ds = [];
 var gaussian_sigma2ds = [];
 var cur_colors = [];

 for (var i = 0; i < num_gaussians; i++) {
     gaussian_mu2ds.push(gaussians[i].mu2d);
     gaussian_sigma2ds.push(gaussians[i].sigma2d);
     cur_colors.push(gaussians[i].color);
 }

 var generation_info = {
     gaussian_mu2ds: gaussian_mu2ds,
     gaussian_sigma2ds: gaussian_sigma2ds,
     gaussian_colors: cur_colors,
     bbx_region: [bbx.start_x, bbx.start_y, bbx.w, bbx.h]
 };

 return generation_info;
}

// Model select
var model_select = document.getElementById("model-select");

// Add model options
for (var i = 0; i < model_list.length; i++) {
 var option = document.createElement("option");
 option.value = model_list[i];
 option.innerHTML = model_list[i];
 model_select.appendChild(option);
}

model_select.value = model_list[0];

model_select.addEventListener("change", function() {
 var model_name = model_select.value;
 var form_data = {"model_name": model_name};
 var model_select_label = document.getElementById("model-select-label");
 model_select_label.innerText = "Loading...";

 fetch("/api/load_model", {
     method: 'POST',
     headers: {'Content-Type': 'application/json;charset=utf-8'},
     body: JSON.stringify(form_data)
 }).then(function (response) {
     return response.json();
 }).then(function(json_response) {
     if (json_response && json_response.successful) {
         model_select_label.innerText = "Select model: ";
         num_gaussians = json_response.num_gaussians;
         initGaussians();
         gauss2DDrawProgram = create2DGaussianDrawProgram();
         fetchAll();
     } else {
         model_select_label.innerText = "ERROR. Please try again.";
     }
 });

}, false);


// Render the initial canvas.
fetchLandmarks(true);