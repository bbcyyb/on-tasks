// Copyright 2017, EMC, Inc.


'use strict';

module.exports = {
    friendlyName: 'Catalog ls',
    injectableName: 'Task.Catalog.ls',
    options: {
        commands: [
            'ls -l'     
        ]
    },
    properties: {
        catalog: {
            type: 'ls'
        }
    }
};
