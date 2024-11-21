import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

export class LogStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
    }

    public createLogGroup(serviceName: string) {
        return new LogGroup(this, `${serviceName}-log-group`, {
            logGroupName: `/ecs/pet-clinic-${serviceName}`,
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }
}
