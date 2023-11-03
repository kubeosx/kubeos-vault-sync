const express = require('express');
const axios = require('axios');
const fs = require('fs');


const configMapName = process.env.CM_NAME;
const namespace = process.env.NAMESPACE; // Replace with your ConfigMap's namespace

const VAULT_TOKEN = process.env.TOKEN; // Replace with your Vault token
const VAULT_ADDR = 'vault-0.vault-backend.svc:8200'; // Replace with your Vault address



const https = require('https');

const agent = new https.Agent({
    ca: fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt')
});
  

const fetchConfigMap = async () => {
    try {
        const token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
        const api = `https://kubernetes.default.svc/api/v1/namespaces/${namespace}/configmaps/${configMapName}`;
        console.log(token);
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
        return response.data;
    } catch (error) {
        console.error('Error fetching ConfigMap:', error);
        return null;
    }
};

const updateConfigMap = async (configMapData) => {
    try {
        const token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
        const api = `https://kubernetes.default.svc/api/v1/namespaces/${namespace}/configmaps/${configMapName}`;

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
console.log("Started Job Successfull");

for (let index = 0; index < 10; index++) {
    console.log('Hello, this is kubeos-vault-sync created by my developer portal!');  
    var cmData = fetchConfigMap();
    console.log(cmData);
    console.log(index);
}

function OnboardAppToVault(appname) {
    
    const policyurl = `${VAULT_ADDR}/v1/sys/policy/${appname}`; // Replace 'tester' with the policy name
    
    const config = {
        headers: {
          'X-Vault-Token': VAULT_TOKEN,
          'X-Vault-Namespace': 'admin', // Adjust the namespace accordingly
          'Content-Type': 'application/json',
        }
      };

    const policy_payload ="{\"policy": "# Grant 'create' and 'update' permission to paths prefixed by 'kubeos'\npath \"kubeos/*\" {\n  capabilities = [ \"create\", \"read\", \"update\", \"delete\", \"list\" ]\n}\n\n# Manage namespaces\npath \"kubeos/dev/*\" {\n   capabilities = [ \"create\", \"read\", \"update\", \"delete\", \"list\" ]\n}\n}"
    
    axios.post(url, policy_payload, config)
    .then(response => {
        console.log('Policy created:', response.data);
    })
    .catch(error => {
        console.error('Error creating policy:', error.response.data);
    });


    const roleurl = `${VAULT_ADDR}/v1/auth/kubernetes/role/${appname}`;

    var role_payload = {
        "bound_service_account_names": appname,
        "bound_service_account_namespaces": "dev",
        "policies": ["dev", "prod"],
        "max_ttl": 1800000
      }

      axios.post(roleurl, role_payload, config)
      .then(response => {
          console.log('Policy created:', response.data);
      })
      .catch(error => {
          console.error('Error creating policy:', error.response.data);
      });
  
}

console.log("Ending Job Successfull");