import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroup: ec2.SecurityGroup;

  private SECURITY_GROUP_NAME = "ecs-security-group";

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create VPC
    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "public-subnet",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // Create Security Group
    this.securityGroup = this.createSecurityGroup(this.SECURITY_GROUP_NAME);

    // Output the VPC ID, subnet ID and security group ID
    new CfnOutput(this, "VPCId", { value: this.vpc.vpcId });
    new CfnOutput(this, "SecurityGroup", {
      value: this.securityGroup.securityGroupId,
    });
  }

  createSecurityGroup(securityGroupName: string) {
    const securityGroup = new ec2.SecurityGroup(this, securityGroupName, {
      vpc: this.vpc,
      securityGroupName: securityGroupName,
      allowAllOutbound: true,
    });

    // Authorize ingress from Port 80
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic",
    );

    securityGroup.connections.allowInternally(
      ec2.Port.tcp(8888),
      "Allow Config Server traffic within security group",
    );

    securityGroup.connections.allowInternally(
      ec2.Port.tcp(8761),
      "Allow Discovery Server traffic within security group",
    );

    securityGroup.connections.allowInternally(
      ec2.Port.tcp(9090),
      "Allow Admin Server traffic within security group",
    );

    return securityGroup;
  }
}
