// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
package org.springframework.samples.petclinic.visits;

import com.amazonaws.util.EC2MetadataUtils;

public class Util {
    public static final String REGION_FROM_EKS = System.getProperty("AWS_REGION") != null ? System.getProperty("AWS_REGION") 
        : System.getenv("AWS_REGION") != null ? System.getenv("AWS_REGION") 
        : "us-west-2";

    public static final String REGION_FROM_EC2 = EC2MetadataUtils.getEC2InstanceRegion() != null ? EC2MetadataUtils.getEC2InstanceRegion() : "us-west-2";

    public static class WellKnownAttributes {
        public static final String OWNER_ID = "owner.id";
        public static final String PET_ID = "pet.id";
        public static final String ORDER_ID = "order.id";
    }
}