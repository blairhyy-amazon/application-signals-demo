import {Stack, StackProps, CfnOutput, Duration} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {PrivateDnsNamespace} from "aws-cdk-lib/aws-servicediscovery";

interface  ServiceDiscoveryStackProps extends StackProps {
    readonly vpc: ec2.Vpc;
}

export class ServiceDiscoveryStack extends Stack {
    public readonly namespace: PrivateDnsNamespace;

    constructor(scope: Construct, id: string, props: ServiceDiscoveryStackProps) {
        super(scope, id);

        this.namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', {
            vpc: props.vpc,
            name: 'ecs-pet-clinic',
        });

        new CfnOutput(this, 'NamespaceId', {value: this.namespace.namespaceId});
    }

    createService(serviceName: string){
        return new servicediscovery.Service(this, serviceName, {
            namespace: this.namespace,
            name: serviceName,
            customHealthCheck: {
                failureThreshold: 2
            },
            routingPolicy:  servicediscovery.RoutingPolicy.WEIGHTED,
            dnsRecordType: servicediscovery.DnsRecordType.A,
            dnsTtl: Duration.seconds(300)
        });
    }
}