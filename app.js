// Isaias Reyes: reyesmotion@gmail.com

const BASE_URL = 'http://localhost:8080/history/';
const WS_URL = 'ws://localhost:8080/realtime';
const PAST_TIME = 900000;  // 15 min in milliseconds
let telemetryArr = [];     // Stores all telemetry data
let itemsToDisplay = 1000; // For performance only display first 1000. More on scroll.
let filterState = {        // keeps state of user filter selections
    pwrVPressed: false,
    pwrCPressed: false,
    ascendingOrder: true
}
let socket = null;
let socketState = {        // keeps state of websocket
    isConnected: false,
    isReconnecting: false
}

window.onload = () => {
    // Generate timestamps for fetching historical telemetry
    let date = new Date();
    let endTime = date.getTime();
    let startTime = date.setMinutes(date.getMinutes() - PAST_TIME);
    // Fetch for both pwr.v and pwr.c
    fetchHistoricalTelemetry('pwr.v', startTime, endTime);
    fetchHistoricalTelemetry('pwr.c', startTime, endTime);
    initWebSocket();
}

// Fetch historical telemetry data for a specific telemetry point
const fetchHistoricalTelemetry = (pointId, startTime, endTime) => {
    let fetchUrl = `${BASE_URL}${pointId}?start=${startTime}&end=${endTime}`;
    fetch(fetchUrl)
        .then(res => {
            return res.json();
        })
        .then(json => {
            let jsonStr = JSON.stringify(json);
            handleResponseJson(jsonStr)
        })
        .catch(error => {
            console.log("Exception: ", error);
        })
}

// Stores response from fetched historical telemetry data
const handleResponseJson = (jsonStr) => {
    let responseObj = JSON.parse(jsonStr);
    // tmp store response object as an array
    let tmpArr = Object.values(responseObj);
    // update main telemetry arr with new data
    telemetryArr = [...telemetryArr, ...tmpArr];
    updateTable();
}

// Establish web socket connection for realtime telemetry data
const initWebSocket = () => {
    socket = new WebSocket(WS_URL);
    socket.onopen = (object) => {
        console.log("websocket is open");
        socketState.isReconnecting = false;
        socketState.isConnected = true;
        // Always subscribe on load
        socket.send('subscribe pwr.v');
        socket.send('subscribe pwr.c');
    }
    socket.onmessage = (event) => {
        let msgObj = JSON.parse(event.data);
        addTelemetryObj(msgObj);
    }
    socket.onerror = (error) => {
        console.log('WebSocket Error: ' + error);
    };
    socket.onclose = (object) => {
        console.log("WebSocket Closed");
        socketState.isConnected = false;
        if (!socketState.isReconnecting) {
            console.log('WebSocket Connection Lost', 'error');
        }
        setTimeout(() => { // Reconnect websocket after 1 sec
            initWebSocket()
            socketState.isReconnecting = true;
            console.log("reconnecting webSocket...")
        }, 1000)
    }
}

// Unsubscribe from websocket. Stop receiving telemetry type
const unsubscribeTelemetryType = (typeStr) => {
    socket.send(`unsubscribe ${typeStr}`);
}

// Subscribe from websocket. Resume receiving telemetry type
const subscribeTelemetryType = (typeStr) => {
    socket.send(`subscribe ${typeStr}`);
}

// Stores new telemetry obj received
const addTelemetryObj = (obj) => {
    telemetryArr.push(obj);
    // update table with new item
    updateTable();
}

// Sorts telemetry arr in chronological order
const sortTelemetryByTimestamp = () => {
    telemetryArr.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

// Updates HTML table with telemetry
let tableContent = document.getElementById('tableContent'); // Only need to initialize once
const updateTable = () => {
    let filteredArr = generateFilteredTelemetryArr();
    // generate html with updated telemetry using filtered array
    const tableHtml = filteredArr.reduce((html, item) => {
        // Create each html row using a template string
        html += `<div class='row'><div>${item.id}</div>\
        <div>${formatTimestamp(item.timestamp)}</div><div>${item.value}</div></div>`
        return html
    }, '')
    tableContent.innerHTML = tableHtml;
};

// Generates filtered telemetry arr using current filter state 
const generateFilteredTelemetryArr = () => {
    sortTelemetryByTimestamp(); // First sort telemetry to account for new items
    // Create new array assigning telemetryArr in the order we need
    let filteredTelemetryArr = filterState.ascendingOrder ?
        telemetryArr : telemetryArr.reverse();
    // filter out items based on current filter state
    filteredTelemetryArr = filteredTelemetryArr.filter(
        e => filterState.pwrVPressed ? e.id !== 'pwr.v' : e)
        .filter(e => filterState.pwrCPressed ? e.id !== 'pwr.c' : e)
        // For efficiency only display a subset of all telemetry data on arr
        .filter((e, idx) => idx < itemsToDisplay);
    return filteredTelemetryArr;
}

// Update number of telemetry items that should be displayed based on user scroll
// TODO: implement
const handleUserScroll = () => { }

// Telemetry filter buttons
const toggleVsBtn = document.getElementById('toggleVsBtn');
const toggleCsBtn = document.getElementById('toggleCsBtn');
const toggleOrderBtn = document.getElementById('toggleOrderBtn');

// Click events for filter buttons
toggleVsBtn.addEventListener('click', () => {
    toggleVsBtn.classList.toggle('pressed'); // update button css
    !filterState.pwrVPressed ? unsubscribeTelemetryType('pwr.v') :
        subscribeTelemetryType('pwr.v');
    filterState.pwrVPressed = !filterState.pwrVPressed; // update filter state
    updateTable();
});
toggleCsBtn.addEventListener('click', () => {
    toggleCsBtn.classList.toggle('pressed'); // update button css
    !filterState.pwrCPressed ? unsubscribeTelemetryType('pwr.c') :
        subscribeTelemetryType('pwr.c');
    filterState.pwrCPressed = !filterState.pwrCPressed; // update filter state
    updateTable();
});
toggleOrderBtn.addEventListener('click', () => {
    // update filer state with opposite of current state
    filterState.ascendingOrder = !filterState.ascendingOrder;
    updateTable();
});

window.addEventListener('scroll', function (e) {
    //TODO: increase items to display when user scrolls
});

// Utils functions
// Simply prepends 0 to get 2 digit format if needed. 
const padDigit = (n) => { return n < 10 ? '0' + n : n }

// Takes timestamp & returns string in format YYYY-MM-DDTHH:MM:SS.SSSZ 
const formatTimestamp = (timeStamp) => {
    let d = new Date(timeStamp);
    let yr = d.getUTCFullYear();
    let mth = padDigit(d.getMonth());
    let day = padDigit(d.getDay());
    let hrs = padDigit(d.getHours());
    let min = padDigit(d.getMinutes());
    let sec = padDigit(d.getSeconds()); //TODO: format decimals
    return `${yr}-${mth}-${day}T${hrs}:${min}:${sec}Z`
}

