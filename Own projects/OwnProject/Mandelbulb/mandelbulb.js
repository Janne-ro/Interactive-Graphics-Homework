//Helper method to output an error message to the screen
function displayError(text) {
    let errorBoxDiv = document.getElementById('error-box');
    let errorSpan = document.createElement('p');
    errorSpan.innerText = text;
    errorBoxDiv.appendChild(errorSpan);
    console.error(text);
}

//Get canvas element
const canvas = document.getElementById('mycanvas');

//Set up WebGL context
const gl = canvas.getContext('webgl');
if (!gl) {
    displayError('Cant load gl element');
}

//Reshape canvas based on the real screen pixels
const pixelRatio = window.devicePixelRatio || 1; //Unused but same as in slides
canvas.width = window.clientWidth;
canvas.height = window.clientHeight;


//Create variable for the sliders and checkboxes
const powerSlider = document.getElementById("Powerslider");
const powerValueDisplay = document.getElementById("Powervalue");
const phiSlider = document.getElementById("Phislider");
const phiValueDisplay = document.getElementById("Phivalue");
const thetaSlider = document.getElementById("Thetaslider");
const thetaValueDisplay = document.getElementById("Thetavalue");
const useDECheckbox = document.getElementById("useDE");
const useCBSCheckbox = document.getElementById("useCBS");

//Vertex shader: renders a full-screen quad
const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

//Fragment shader: implements the Mandelbulb using ray marching
const fragmentShaderSource = `
    precision highp float;

    //Initialize the global variables/uniforms
    uniform vec2 resolution;
    uniform float time;
    uniform float power;
    uniform bool useDE;
    uniform bool useCBS;
    uniform float phiTwist;
    uniform float thetaTwist;

    //Helper function to make the mandelbulb rotate
    vec3 rotate(vec3 p) {
        //TO-DO: Slider to change rotation speed
        float angle = time * 0.2;
        //Implements something equivalent to a rotation in 2D (y coordinate is unaffected)
        return vec3(p.x * cos(angle) + p.z * sin(angle), p.y, -p.x * sin(angle) + p.z * cos(angle));
    }

    //Check if point is in the Mandelbulb (no DE) (way too slow) (scratched)
    bool mandelbulbCheck(vec3 pos) {

        vec3 trackedPoint = pos; //The position of the point we track which we check if it escapes
        const int Iterations = 100; //Changes how accurtaly the mandelbulb is calculated (performance trade-off, 100 seems fine)

        for (int i = 0; i < Iterations; i++) {

            //breaks if we are outside of the bailout radius 
            float distanceOrigin = length(trackedPoint);
            if (distanceOrigin > 2.0){
                return false; 
            }

            //Convert the trackedPoint to spherical coordinates in order to apply simpler mandelbulb transform
            float theta = acos(trackedPoint.z / distanceOrigin);
            float phi = atan(trackedPoint.y, trackedPoint.x);

            //Apply Mandelbulb transformation
            theta *= power;
            phi   *= power;
            trackedPoint = pow(distanceOrigin, power) * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));

            //Add the point to the trackedPoint for next iteration
            trackedPoint += pos;
        }
        //If the tracked point never escapes its likely inside the mandelbulb
        return true; 
    }

    //ray marching without distance estimator (way too slow) (scratched)
    float rayMarchNoDE(vec3 cameraPosition, vec3 rayDirection) {
        float totalDistance = 0.0; 
        const float maxDistance = 100.0;
        const float stepSize = 0.01;  //Performance trade off for accuracy
        const int maxSteps = 2000;  //Again performance trade off for accuracy

        for (int i = 0; i < maxSteps; i++) {
            vec3 position = cameraPosition + rayDirection * totalDistance; //Move forward by stepSize

            //Check if we are inside the fractal and if not stop marching --> we hit a surface
            if (mandelbulbCheck(position)) { 
                return totalDistance;
            }

            //March the ray forward by a fixed amount
            totalDistance += stepSize; 

            //Stop if we are at max distance
            if (totalDistance > maxDistance){
                return maxDistance;
            }
        }
        
    }


    //Function that estimates the minimal distance from the points position to the Mandelbulb's surface (using DE)
    float mandelbulbDE(vec3 position) {

        vec3 trackedPoint = position;
        float derivative = 1.0; //accumulates the effect of the derivative (ie. the rate at which the function is changing), used to scale our distance estimate later
        float distanceOrigin = 0.0;
        const int Iterations = 30;

        for (int i = 0; i < Iterations; i++) {

            distanceOrigin = length(trackedPoint);
            //breaks if we are outside of the bailout radius and returns 
            if (distanceOrigin > 2.0){
                break;
            }

            //Accumulates the derivative with respect to c: dr = |z|**(power - 1) * power * last_derivative + 1, original formula: dz_n+1/dc = d/dc f(z_n)+c =f'(z_n)*dz_n/dc+1
            derivative = pow(distanceOrigin, power - 1.0) * power * derivative + 1.0;
            
            //Convert to spherical coordinates
            float theta = acos(trackedPoint.z / distanceOrigin);
            float phi = atan(trackedPoint.y, trackedPoint.x);

            //Twist phi and theta for cool effects
            //Theres a lot of cool stuff you can do here: e.g. changing += with *= or taking away the distanceOrigin
            phi += phiTwist * distanceOrigin;
            theta += thetaTwist * distanceOrigin;

            //Apply Mandelbulb transformation
            theta *= power;
            phi   *= power;
            float newDistance = pow(distanceOrigin, power);

            //transform back to cartesian coordinates
            trackedPoint = newDistance * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));

            //Add the point to the trackedPoint for next iteration
            trackedPoint += position;
        }
        //fromula from fractal distance estimation techniques (estimate of the minimal distance from the points position to the Mandelbulb's surface)
        return 0.5 * log(distanceOrigin) * distanceOrigin / derivative;
    }

    // Ray marching function (with DE)
    float rayMarchDE(vec3 cameraPosition, vec3 rayDirection) {

        float totalDistance = 0.0;
        const float maxDistance = 100.0;
        const float minDistance = 0.005;
        const int maxSteps = 200;

        for (int i = 0; i < maxSteps; i++) {
            //Explore next position along the ray
            vec3 position = cameraPosition + rayDirection * totalDistance;

            //Get the distance from the rotated position
            float dist = mandelbulbDE(rotate(position));

            //if we would hit an object in the next step
            if (dist < minDistance){
                return totalDistance;
            }
            totalDistance += dist;
            //If we exceed the max dist
            if (totalDistance > maxDistance){
                return totalDistance;
            } 
        }
    }


    // Estimate the surface normal (defines orientation of the surface) using gradient approximation for shading
    vec3 estimateNormal(vec3 pos) {
        //scale eps with power as for small powers the suface gradient estimation has numerical issues because the distance estimation mandelbulbDE can get very small
        //thus eps should get bigger with smaller powers making it more imprecise but reducing occuring flickering greatly
        float eps = max(0.001, 0.01 / power); 
        return normalize(vec3(
            mandelbulbDE(rotate(pos+vec3(eps, 0.0, 0.0))) - mandelbulbDE(rotate(pos-vec3(eps, 0.0, 0.0))),
            mandelbulbDE(rotate(pos+vec3(0.0, eps, 0.0))) - mandelbulbDE(rotate(pos-vec3(0.0, eps, 0.0))),
            mandelbulbDE(rotate(pos+vec3(0.0, 0.0, eps))) - mandelbulbDE(rotate(pos-vec3(0.0, 0.0, eps)))
        ));
    }

    void main() {
        float distance;
        // Normalized pixel coordinates (range: -aspect to aspect, -1 to 1)
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
        
        //set up the camera such that it looks in the -z direction
        vec3 cameraPosition = vec3(0.0, 0.0, 3.4);
        vec3 rayDirection = normalize(vec3(uv, -1.0));

        //ray marching to find the intersection of the surface 
        if (useDE) {
            distance = rayMarchDE(cameraPosition, rayDirection);  // Using Distance Estimator
        } else {
            distance = rayMarchNoDE(cameraPosition, rayDirection); // Using Fixed Step Ray Marching
        }
        vec3 color = vec3(0.0, 0.0, 0.0);
        const float maxDistance = 100.0;
        
        if (distance < maxDistance) {
            vec3 pos = cameraPosition + rayDirection * distance;
            vec3 normal = estimateNormal(pos);

            if(useCBS){
                //Edge highlights and diffuse shading
                vec3 lightDirection = normalize(vec3(-0.5, 0.8, -0.6));
                float diff = clamp(dot(normal, lightDirection), 0.0, 1.0);

                // Scale curvature for better effect
                float curvature = length(estimateNormal(pos + 0.01) - estimateNormal(pos));

                // Ensure lighting doesn't make it too dark
                float minLight = 0.1;
                float finalLight = max(diff, minLight);

                color = ((vec3(curvature) + vec3(0.3, 0.9, 0.3)) * finalLight) / 2.0;
            }else{
                //Basic diffuse shading with a fixed light direction
                vec3 lightDirection = normalize(vec3(-0.5, 0.8, -0.6));
                float diff = clamp(dot(normal, lightDirection), 0.0, 1.0);
                color = vec3(0.3, 0.9, 0.3) * diff;
            }

            /* (Curvature based shading) highlights edges 
            float curvature = length(estimateNormal(pos + 0.01) - estimateNormal(pos));
            color = vec3(curvature);*/

            //Also tried orbit traps and lighting based on orientation of the surface normal (color = abs(normal)) but doesnt look so good
        }
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

//Compile the vertex shader
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader)
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const errorMsg = gl.getShaderInfoLog(vertexShader);
    displayError(`Failed to compile vertex shader: ${errorMsg}`);
}

//Compile the fragment shader
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader)
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const errorMsg = gl.getShaderInfoLog(fragmentShader);
    displayError(`Failed to compile vertex shader: ${errorMsg}`);
}

//Create the program and attach shaders
const prog = gl.createProgram();
gl.attachShader(prog, vertexShader);
gl.attachShader(prog, fragmentShader);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  displayError("Program failed to link: " + gl.getProgramInfoLog(prog));
}
gl.useProgram(prog);

//Define a full-screen quad in order to give the fragment shader something to work with after rastarization
const verticies = [
    -1,-1,
    1, -1,
    -1, 1,
    1,  1,
];
/*old version - uses naive implementation for quad generation (repetition)
const verticies = [
    // First triangle
    -1, -1,
    1, -1,
    -1,  1,
    //Second triangle
    -1,  1,
    1,  1,
    1, -1,
];*/

//Pass data from JS code (CPU memory) to GPU memory
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticies), gl.STATIC_DRAW);

//Defines how to read the vertex position from the buffer
const position = gl.getAttribLocation(prog, "position");
gl.vertexAttribPointer(position, //index: vertex attribute location
    2, //size: number of components in the attribute
    gl.FLOAT, //type: type of data in the GPU buffer for this attribute
    false, //normalized: if type=float and is writing to a vec(n) float input, should WebGL normalize the ints first in [-1,1]?
    0, //stride: bytes between starting byte of attribute for a vertex and the same attrib for the next vertex, 0 means it does so automatically 
    0 //offset: bytes between the start of the buffer and the first byte of the attribute, 0 means it does so automatically
);
gl.enableVertexAttribArray(position);

// Set "global" variables (uniform) that are used to pass data from the JS program (CPU) to the shaders
const resolution = gl.getUniformLocation(prog, "resolution");
const time = gl.getUniformLocation(prog, "time");
const power = gl.getUniformLocation(prog, "power");
const useDE = gl.getUniformLocation(prog, "useDE")
const useCBS = gl.getUniformLocation(prog, "useCBS")
const phiTwist = gl.getUniformLocation(prog, "phiTwist");
const thetaTwist = gl.getUniformLocation(prog, "thetaTwist");

let startTime = Date.now();
let currentPower = parseFloat(powerSlider.value);
let currentPhiTwist = parseFloat(phiSlider.value);
let currentThetaTwist = parseFloat(thetaSlider.value);
let useDistanceEstimator = useDECheckbox.checked;
let useCurvutureBasedShading = useCBSCheckbox.checked;

//The loop to render the program
function render() {
    //Update the canvas size (needed if we eg change the screen to display)
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Update uniforms (2,1D floats and 1D int)
    const passedTime = (Date.now() - startTime) * 0.001;
    gl.uniform2f(resolution, canvas.width, canvas.height); //Needed if we eg change the screen to display 
    gl.uniform1f(time, passedTime);
    gl.uniform1f(power, currentPower);
    gl.uniform1i(useDE, useDistanceEstimator); //Somehow there is no uniform for booleans... so we have to use int
    gl.uniform1i(useCBS,useCurvutureBasedShading);
    gl.uniform1f(phiTwist, currentPhiTwist);
    gl.uniform1f(thetaTwist, currentThetaTwist);

    //Clear and draw
    gl.clearColor(0.0, 0.0, 0.0, 1.0); //Make background black
    gl.clear(gl.COLOR_BUFFER_BIT); //
    //Draws full screen quad

    //new version - using triangle strips
    gl.drawArrays(gl.TRIANGLE_STRIP,
    0, //starting index in the vertex buffer
    4  //number of verticies to use
    );

    /* old version - uses naive implementation for quad generation (repetition)
    gl.drawArrays(gl.TRIANGLES,
    0, //starting index in the vertex buffer
    6 //number of verticies to use
    );*/

    requestAnimationFrame(render); //calls itself to ensure continous rendering
}
//start rendering loop
requestAnimationFrame(render);

//Update power 
powerSlider.addEventListener('input', (e) => {
    currentPower = parseFloat(e.target.value); //Sets current power (used in rendering loop)
    powerValueDisplay.textContent = currentPower.toFixed(1); //Changes the displayed power value in the slider
});

//Update wheter to use DE
useDECheckbox.addEventListener("change", () => {
    useDistanceEstimator = useDECheckbox.checked; 
    render(); //Call render function to apply changes
});

//Update wheter to use CBS
useCBSCheckbox.addEventListener("change", () => {
    useCurvutureBasedShading = useCBSCheckbox.checked; 
    render(); //Call render function to apply changes
});

//Update phi twist
phiSlider.addEventListener('input', (e) => {
    currentPhiTwist = parseFloat(e.target.value); //Sets current phi twist (used in rendering loop)
    phiValueDisplay.textContent = currentPhiTwist.toFixed(1); //Changes the displayed power value in the slider
});

//Update power variable when slider changes
thetaSlider.addEventListener('input', (e) => {
    currentThetaTwist = parseFloat(e.target.value); //Sets current theta twist (used in rendering loop)
    thetaValueDisplay.textContent = currentThetaTwist.toFixed(1); //Changes the displayed theta twist value in the slider
});

