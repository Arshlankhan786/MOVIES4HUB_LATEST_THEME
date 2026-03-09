const axios = require('axios');
axios.get('https://animeverseapi-production.up.railway.app/api/home')
    .then(r => console.log('Status:', r.status))
    .catch(e => {
        console.error('Error MESSAGE:', e.message);
        console.error('Error STATUS:', e.response?.status);
        console.error('Error DATA:', e.response?.data);
    });
