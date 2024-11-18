import * as cdk from 'aws-cdk-lib';
import * as assert from "assert";

import {getECRImagePrefix} from "./utils";
import {EcsClusterStack} from "./stacks/ecsStack";
import {IamRolesStack} from "./stacks/iamRolesStack";
import {NetworkStack} from "./stacks/networkStack";
import {ServiceDiscoveryStack} from "./stacks/servicediscoveryStack";

class ApplicationSignalsECSDemo {
    private readonly app: cdk.App;
    private readonly region: string;
    private ecsImagePrefix: string;

    constructor(region: string = 'us-east-1') {
        this.app = new cdk.App();
        this.region = region;
        this.ecsImagePrefix = '';
    }

    public runApp(): void {
        this.getECRImagePrefix();
        this.createStacks();
        this.app.synth();
    }

    private createStacks(): void {
        const networkStack = new NetworkStack(this.app, 'NetworkStack');
        const iamRolesStack = new IamRolesStack(this.app, 'IamRolesStack');
        const serviceDiscoveryStack = new ServiceDiscoveryStack(this.app, 'ServiceDiscoveryStack', {
            vpc: networkStack.vpc,
        });

        const ecsClusterStack = new EcsClusterStack(this.app, 'EcsClusterStack', {
            vpc: networkStack.vpc,
        });
    }

    private getECRImagePrefix(): void {
        getECRImagePrefix(this.region)
            .then((prefix) => {
                this.ecsImagePrefix = prefix;
                assert(this.ecsImagePrefix !== "", "ECR Image Prefix is empty");
            })
            .catch((err) => console.error("Error:", err))

    }
}

const demo = new ApplicationSignalsECSDemo();
demo.runApp();

