'use strict';

var di = require('di');
module.exports = ipmiPowerstatusAlertJobFactory;
di.annotate(ipmiPowerstatusAlertJobFactory, new di.Provide('Job.Poller.Alert.Ipmi.Powerstatus'));
di.annotate(ipmiPowerstatusAlertJobFactory, new di.Inject(
    'Job.Base',
    'Services.Configuration',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    '_'
));
function ipmiPowerstatusAlertJobFactory(
    BaseJob,
    configuration,
    Logger,
    util,
    assert,
    Errors,
    Promise,
    _
) {
    var logger = Logger.initialize(ipmiPowerstatusAlertJobFactory);

    function IpmiPowerstatusAlertJob(options, context, taskId) {
        IpmiPowerstatusAlertJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);
        
        this.cachedPowerState = {};
    }

    util.inherits(IpmiPowerstatusAlertJob, BaseJob);

    IpmiPowerstatusAlertJob.prototype._run = function run() {
        var self = this;

        _.forEach(['power'],
            function(command) {
                self._subscribeIpmiCommandResult(
                    self.routingKey,
                    command,
                    self.publishPowerstatusAlert(command)
                );
            }
        );
    };
    
    IpmiPowerstatusAlertJob.prototype.publishPowerstatusAlert = function(command) {
        var self = this;
        return function(data) {
            
            if(self.cachedPowerState[data.workItemId] != data.powerstatus) {
                let entity = {};
                entity.type = 'polleralert';
                entity.action = 'powerstatus.updated';
                entity.typeId = data.workItemId;
                entity.nodeId = data.node;
                entity.severity = 'information';
                entity.version = '1.0';
                entity.createAt = new Date();
                entity.data = {
                    states: {
                        last: self.cachedPowerState[data.workItemId], 
                        current: data.powerstatus
                    }
                };

                self._publishPollerAlert(entity);
                self.cachedPowerState[data.workItemId] = data.powerstatus;
            }
        };
    };
    return IpmiPowerstatusAlertJob;
}
