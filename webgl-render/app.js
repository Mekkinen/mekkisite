
var fs = require('fs');
var gl = document.getElementById('glCanvas').getContext('webgl');
var OBJ = require('webgl-obj-loader');

var meshPath = '../models/crystal.obj';
var opt = { encoding: 'utf8' };
var mesh;

const readMeshes = () => {
    fs.readFile(meshPath, opt, function (err, data) {
        if (err) return console.error(err);
        mesh = new OBJ.Mesh(data);
    });
};

const webGLStart = (meshes) => { 
    app.meshes = meshes;
    // initialize the VBOs
    OBJ.initMeshBuffers(gl, mesh);

    // refer to the initMeshBuffers docs for an example of
    // how to render the mesh to the screen after calling
    // initMeshBuffers
}

window.onload = () => {
    readMeshes.then(webGLStart);
}

