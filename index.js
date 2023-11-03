const express = require('express');
const axios = require('axios');
const fs = require('fs');


const configMapName = 'vaultrole';
const namespace = 'dev'; // Replace with your ConfigMap's namespace
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
    fetchConfigMap();
}


console.log("Ending Job Successfull");