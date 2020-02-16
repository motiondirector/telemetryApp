# Open MCT Coding exercise

## Instructions to run

### Download Telemetry Server
git clone https://github.com/nasa/openmct-tutorial.git
cd openmct-tutorial

### Update server to accept request from different port

install new dependency
```
npm install cors --save
```

open file  /openmct-tutorial/example-server/server.js

add code below to this file

```
var cors = require('cors')

app.use(cors()) 
```

then from terminal install all dependencies and start the server
```
npm install

npm start
```

### Download Open MCT Coding exercise
git clone https://github.com/

cd into this local repo

start new local server from terminal such as:

```
python -m SimpleHTTPServer 8081
```

See the app working from: 

http://localhost:8081/


