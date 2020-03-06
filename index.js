var glmatrix = require('gl-matrix');
var svs  = require('./shader/vertex.c');
var sfs  = require('./shader/fragment.c');

setup();

// Adds a canvas to the page and start rendering the scene
function setup() {
    var body     = document.getElementsByTagName('body')[0];
    var glCanvas = getCanvas(body);
    
    //create a simple renderer and a simple triangle
    var renderer = simpleRenderer(glCanvas.gl, 1, new Float32Array([-0.5,-0.5,-1.0,0.0,0.5,-1.0,0.5,-0.5,-1.0]));

    //Create a matrix to transform the triangle
    var matrix = glmatrix.mat4.create();
    //Move it back 4 units
    glmatrix.mat4.translate(matrix, matrix, [0.0, 0.0, -4.0]);

    //Called when a frame is scheduled.  A rapid sequence of scene draws creates the animation effect.
    var renderFn = function(timestamp) {
        glmatrix.mat4.rotateY(matrix, matrix, Math.PI/128);
        renderer(matrix, [1, 0, 1]);
        window.requestAnimationFrame(renderFn);
    }

    window.requestAnimationFrame(renderFn);

}

// Get A WebGL context
function getCanvas(parent) {
    //Create a canvas with specified attributes and append it to the parent.
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'glcanvas');
    canvas.setAttribute('width', '400');
    canvas.setAttribute('height', '400');
    parent.appendChild(canvas);
    
    var gl     = canvas.getContext('webgl');
    return {canvas: canvas, gl : gl}
}

//Returns a simple rendering function that draws the passed in vertices.
function simpleRenderer(gl, aspect, vertices) {

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, svs());
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, sfs());
    gl.compileShader(fragmentShader);
    
    var shaders = [vertexShader, fragmentShader];
    var program = gl.createProgram();
    shaders.forEach(function(shader) {
        gl.attachShader(program, shader);
    })
    gl.linkProgram(program);
    
    return function(parentNode, color) {
        gl.clear(gl.GL_COLOR_BUFFER_BIT);

        //Field of view is very similar to a cameras field of view.
        var fieldOfView = Math.PI/2;
        //Far edge of scene defines how far away an object can be from the camera before it disappears.
        var farEdgeOfScene = 100;
        //Near edge of scene defines how close an object can be from the camera before it disappears.
        var nearEdgeOfScene = 1;

        //Creates a perspective transformation from the above parameters.
        var perspective = glmatrix.mat4.perspective(glmatrix.mat4.create(), fieldOfView, aspect, nearEdgeOfScene, farEdgeOfScene);
        //Apply perspective to the parent transformation (translate + rotation)
        var projection = glmatrix.mat4.multiply(glmatrix.mat4.create(), perspective, parentNode);
        
        gl.useProgram(program);
        
        var matrixLocation = gl.getUniformLocation(program, "u_matrix");
    
        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, projection);

        // set the color
        var colorLocation = gl.getUniformLocation(program, "u_color");
        gl.uniform4f(colorLocation, color[0], color[1], color[2], 1.0);
        
        // Create a buffer for the positions
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        
        // look up where the vertex data needs to go.
        var positionLocation = gl.getAttribLocation(program, "a_position");
    
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length/3);
    }

}