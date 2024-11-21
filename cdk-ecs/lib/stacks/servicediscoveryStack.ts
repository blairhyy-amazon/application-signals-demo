import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface ServiceDiscoveryStackProps extends StackProps {
    readonly vpc: ec2.Vpc;
}

export class ServiceDiscoveryStack extends Stack {
    public readonly namespace: servicediscovery.PrivateDnsNamespace;

    constructor(scope: Construct, id: string, props: ServiceDiscoveryStackProps) {
        super(scope, id);

        this.namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', {
            vpc: props.vpc,
            name: 'ecs-pet-clinic',
        });

        new CfnOutput(this, 'NamespaceId', { value: this.namespace.namespaceId });
    }

    createService(serviceName: string) {
        const dnsService = `${serviceName}-DNS`;
        return new servicediscovery.Service(this, dnsService, {
            namespace: this.namespace,
            name: dnsService,
            customHealthCheck: {
                failureThreshold: 2, // TODO: A known issue that failure threshold cannot be set other than 1: https://github.com/hashicorp/terraform-provider-aws/issues/35559
            },
            routingPolicy: servicediscovery.RoutingPolicy.WEIGHTED,
            dnsRecordType: servicediscovery.DnsRecordType.A,
            dnsTtl: Duration.seconds(300),
        });
    }
}
