// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');

module.exports = ucsJobFactory;
di.annotate(ucsJobFactory, new di.Provide('Job.Ucs'));
di.annotate(ucsJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Promise',
    'Services.Waterline',
    'JobUtils.UcsTool',
    'Services.Configuration',
    'Assert'));

function ucsJobFactory(
    BaseJob,
    Logger,
    util,
    Promise,
    waterline,
    UcsTool,
    configuration,
    assert) {
    var logger = Logger.initialize(ucsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function UcsJob(options, context, taskId) {
        UcsJob.super_.call(this, logger, options, context, taskId);
        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);

        this.concurrent = {};
        this.maxConcurrent = 1;
        this.ucsComandOptions = {
            "ucs.powerthermal": "memoryUnitEnvStats,processorEnvStats",
            "ucs.fan": "equipmentFanStats",
            "ucs.psu": "equipmentPsuStats",
            "ucs.disk": "storageLocalDiskSlotEp",
            "ucs.led": "equipmentLed",
            "ucs.sel": "sysdebugMEpLog"
        };
    }

    util.inherits(UcsJob, BaseJob);

    /**
     * @function _initUcsTool
     * @description generate a new UcsTool object.
     **/
    UcsJob.prototype._initUcsTool = function() {
        return new UcsTool();
    };

    /**
     * @function _run
     * @description the jobs internal run method
     **/
    UcsJob.prototype._run = function() {
        var self = this;

        return waterline.workitems.update({
                name: "Pollers.UCS"
            }, {
                failureCount: 0
            })
            .then(function() {
                return self._subscribeUcsCommand(self.routingKey, self._subscribeUcsCallback);
            });
    };

    UcsJob.prototype._subscribeUcsCallback = function(data) {
        var self = this;
        return new Promise(
            function(reslove, reject) {
                if (self.concurrentRequests(data.node, data.workItemId)) {
                    return reject(new Error("max number of request has been reached."));
                } else {
                    self.addConcurrentRequest(data.node, data.workItemId);
                    return reslove();
                }
            })
            .then(function() {
                return waterline.obms.findByNode(data.node, 'ucs-obm-service', true)
                    .then(function(obmSetting) {
                        if (obmSetting) {
                            return {
                                "dn": obmSetting.config.dn,
                                "command": data.config.command,
                                "data": data
                            };
                        }
                    });
            })
            .then(function(entity) {
                return self._collectUcsPollerData(entity);
            })
            .then(function(result) {
                data.result = result;
                return self._publishUcsCommandResult(self.routingKey,
                    data.config.command,
                    data);
            })
            .then(function() {
                return waterline.workitems.findOne({
                    id: data.workItemId
                });
            })
            .then(function(workitem) {
                return waterline.workitems.setSucceeded(null, null, workitem);
            })
            .catch(function(error) {
                logger.error('error occured ' + error);
            })
            .finally(function() {
                self.removeConcurrentRequest(data.node, data.workItemId);
            });
    };

    UcsJob.prototype._collectUcsPollerData = function(entity) {
        var self = this;
        return Promise.resolve()
            .then(function() {
                var url = "/pollers?identifier=" + entity.dn + "&classIds=" +
                    self.ucsComandOptions[entity.command];
                var ucs = self._initUcsTool();
                return ucs.clientRequest(url)
                    .then(function(res) {
                        return res.body;
                    })
                    .then(function(result) {
                        return result;
                    });
            });
    };

    /**
     * @function concurrentRequests
     * @description manage concurrent work item command requests
     */
    UcsJob.prototype.concurrentRequests = function(node, type) {
        var self = this;
        assert.string(node);
        assert.string(type);
        if (!_.has(self.concurrent, node)) {
            self.concurrent[node] = {};
        }
        if (!_.has(self.concurrent[node], type)) {
            self.concurrent[node][type] = 0;
        }
        if (self.concurrent[node][type] >= self.maxConcurrent) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * @function addConcurrentRequest
     * @description add a new command request for this work item
     */
    UcsJob.prototype.addConcurrentRequest = function(node, type) {
        var self = this;
        assert.object(self.concurrent[node]);
        assert.number(self.concurrent[node][type]);
        self.concurrent[node][type] += 1;
    };

    /**
     * @function removeConcurrentRequest
     * @description remove a completed command request for this work item
     */
    UcsJob.prototype.removeConcurrentRequest = function(node, type) {
        var self = this;
        assert.object(self.concurrent[node]);
        assert.number(self.concurrent[node][type]);
        self.concurrent[node][type] -= 1;
    };

    return UcsJob;
}
