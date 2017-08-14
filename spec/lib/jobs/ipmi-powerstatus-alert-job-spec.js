"use strict";

describe("Ipmi Powerstatus Alert Job", () = > {
    let base = require('./base-spec');
    let Errors;
    let job;
    let sandbox = sinon.sandbox.create();

    base.before(context => {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-powerstatus-alert-job.js')            
        ]);

        Errors = helper.injector.get('Errors');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.Powerstatus');
    });

    before("Ipmi Powerstatus Alert Job before", () => {
        let baseJob = help.injector.get('Job.Base');
        sandbox.stub(baseJob.prototype, '_subscribeIpmiCommandResult');
        sandbox.stub(baseJob.prototype, '_subscribeSnmpCommandResult');
        sandbox.stub(baseJob.prototype, '_subscribeRequestPollerCache');
        sandbox.stub(baseJob.prototype, '_subscribeRedfishCommandResult');
        sandbox.stub(baseJob.prototype, '_subscribeMetricResult');
    });

    after("Ipmi Powerstatus Alert Job after", () => {
        sandbox.restore();
    });

    beforeEach("Ipmi Powerstatus Alert Job beforeEach", () => {
        job = new this.Jobclass({}, { graphId: uuid.v4()}, uuid.v4());
    });

    afterEach("Ipmi Powerstatus Alert Job afterEach", () => {
        sandbox.reset();
    });

    describe("Powerstatus", () => {
        let self = this;
        it("should return ON when turn on  node power", () => {
           let inputsatus = {pwerstatus: 'ON', workItemId: 1};
           self.job.cachedPowerState["1"] = 'OFF'
           self.job.publicPowerstatusAlert("power")(inputstatus)
            .then(status => {
                expect(self.job.cachedPowerState["1"].to.equal())
            });
        });
    });
});
