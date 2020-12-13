'use strict';

const hapi = require('@hapi/hapi');
const path = require('path');
const mongoose = require('mongoose');

// use MongoDb: database 'hapidb'
//              collection 'tasks'
mongoose.connect('mongodb://localhost/hapidb', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        .then(() => console.log('MongoDb connected'))
        .catch(err => console.log(err));

// define task's model and it's schema
const mongoTask = mongoose.model('Task', { text: String });

const init = async () => {

    const server = hapi.server({
        port: 8000,
        host: 'localhost',
        routes: {
            files: {
                relativeTo: path.join(__dirname, 'public')
            }
        }
    });

    // modules to handle templates 
    const handlebars = require('handlebars');
    const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');

    // process static content
    await server.register(require('@hapi/inert'));

    // support for creating templated responses
    await server.register(require('@hapi/vision'));

    server.views({
        engines: {
            html: allowInsecurePrototypeAccess(handlebars)
        },
        relativeTo: __dirname,
        path: 'views'
    });
    
    // test routing for static files 
    server.route({
        method: 'GET',
        path: '/about',
        handler: function (request, h) {
            return h.file('./about.html');
        }
    });

    // test parameters parsing
    server.route({
        method: 'GET',
        path: '/user/{name}',
        handler: (request, h) => {
            return 'Hello, ' + request.params.name;
        }
    });

    // get all tasks from db and return to view
    server.route({
        method: 'GET',
        path: '/tasks',
        handler: async (request, h) => {
            let result;
            
            await mongoTask.find((error, tasks) => {
                result = tasks;
            });

            return h.view('tasks', {
                tasks: result
            });
        }
    });

    // save new task to db 
    server.route({
        method: 'POST',
        path: '/tasks',
        handler: async (request, h) => {
            let text = request.payload.text;
            let newTask =  new mongoTask({ text: text });
            newTask.save((err, task) => { });
            return h.redirect().location('tasks');
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return h.view('index', {
                name: 'hapiapp'
            });
        }
    });

    await server.start();

    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
