// import { Server } from 'node-static';
// import { createServer } from 'http';

// // Local file-sharing so models can be loaded
// var file = new Server('F:/WebDev/mekkisite/mekkisite/');
// createServer(function (request, response) {
    
//     request.addListener('end', function () {
        
//         fileServer.serve(request, response, function (e, res) {
//             if (e && (e.status === 404)) { // If the file wasn't found
//                 fileServer.serveFile('/models/crystal.obj', 404, {}, request, response);
//             }
//         });

//         file.serve(request, response);
//     }).resume();
// }).listen(8080);

// Trying to use fs still

var fs = require('browserify-fs');
 
const testFileSystem = () => { fs.mkdir('/home', function() {
    fs.readFile('/mnt/f/WebDev/mekkisite/mekkisite/models/crystal.obj', 'utf-8', (err, data) => {
        console.log(data);
    });
    // fs.writeFile('/home/hello-world.txt', 'Hello world!\n', function() {
    //     fs.readFile('/home/hello-world.txt', 'utf-8', function(err, data) {
    //         console.log(data);
    //     });
    // });
});
};

module.exports = testFileSystem;
