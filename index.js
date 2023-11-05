const express = require('express');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

const configMapName = process.env.CM_NAME;
const namespace = process.env.NAMESPACE;
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const VAULT_ADDR = process.env.VAULT_ADDR;;

console.log("Started Job");

// KUBERNETES
const agent = new https.Agent({
    ca: fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt')
});

const token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
const api = `https://kubernetes.default.svc/api/v1/namespaces/${namespace}/configmaps/${configMapName}`;

console.log(token);

// returns array of config maps  sample : [{"metadata":{},"data": {"app": "four-api"}}]
const fetchFilteredConfigMap = async () => {
    try {
        const filterurl = `https://kubernetes.default.svc/api/v1/namespaces/${namespace}/configmaps?labelSelector=kubeos.io/vault-cm=vault-config`
        const response = await axios({
            httpsAgent: agent,
            method: 'get',
            url: filterurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(response.data);

        return response.data.items;
    } catch (error) {
        console.error('Error fetching ConfigMap:', error);
        return null;
    }
};

const fetchConfigMap = async () => {
    try {
        const response = await axios({
            httpsAgent: agent,
            method: 'get',
            url: api,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(response.data);

        return response.data.data;
    } catch (error) {
        console.error('Error fetching ConfigMap:', error);
        return null;
    }
};

const updateConfigMap = async (configMapData) => {
    try {
        await axios({
            httpsAgent: agent,
            method: 'put',
            url: api,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: configMapData,
        });

        console.log('ConfigMap updated');
    } catch (error) {
        console.error('Error updating ConfigMap:', error);
    }
};

const SyncVaultPolicy = async (appname) => {
    const policyurl = `${VAULT_ADDR}/v1/sys/policy/${appname}`;
    const policy_payload = {
        "policy": `path \"kubeos/+/dev/${appname}*\" {\n  capabilities = [ \"create\", \"read\", \"update\", \"delete\", \"list\" ]\n}`
    }

    const response = await axios({
        method: 'post',
        url: policyurl,
        headers: {
            'X-Vault-Token': VAULT_TOKEN,
            'X-Vault-Namespace': 'admin', // Adjust the namespace accordingly
            'Content-Type': 'application/json',
        },
        data: policy_payload
    });
    console.log(response.data);
    return response.data;

}

const SyncVaultRole = async (appname) => {
    const roleurl = `${VAULT_ADDR}/v1/auth/kubernetes/role/${appname}`;

    var role_payload = {
        "bound_service_account_names": appname,
        "bound_service_account_namespaces": "dev",
        "policies": [appname],
        "max_ttl": 18000
    }

    const response = await axios({
        method: 'post',
        url: roleurl,
        headers: {
            'X-Vault-Token': VAULT_TOKEN,
            'X-Vault-Namespace': 'admin', // Adjust the namespace accordingly
            'Content-Type': 'application/json',
        },
        data: role_payload
    });

    console.log(response.data);
    return response.data;
}


const createDummySecret = async (appname) => {
    const roleurl = `${VAULT_ADDR}/v1/kubeos/data/dev/${appname}`;

    var payload = { "data": { "password": "my-long-password" } };
    
    const response = await axios({
        method: 'post',
        url: roleurl,
        headers: {
            'X-Vault-Token': VAULT_TOKEN,
             // 'X-Vault-Namespace': 'admin', // Adjust the namespace accordingly
            'Content-Type': 'application/json',
        },
        data: payload
    });

    console.log(response.data);
    return response.data;
}

const OnboardAppToVault = async () => {
    var appname = await fetchConfigMap();
    console.log(appname.apps);
    var allApps = JSON.parse(appname.apps);
    allApps.forEach(async (app) => {
        await SyncVaultPolicy(app)

        await SyncVaultRole(app)
    });

    return true;
}

const VaultRolePolicySyncronizer = async () => {
    var all_config_maps_filtered = await fetchFilteredConfigMap();
    console.log(all_config_maps_filtered);
    all_config_maps_filtered.forEach(async (cm) => {
        await SyncVaultPolicy(cm.data.app)
        await SyncVaultRole(cm.data.app)
        await createDummySecret(cm.data.app)
    });

    return true;
}

console.log("VaultRolePolicySyncronizer Started");
VaultRolePolicySyncronizer()
    .then(res => {
        console.log(res);
        console.log("Ending Job Successfull");
    })
    .catch(err => {
        console.log(err);
        console.log("Ending Job with Error");
    });
