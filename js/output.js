"use strict";
class EventDetails {
    ID = crypto.randomUUID();
    ShowEvent = false;
    Title = "";
    ShortDescription = "";
    FullDescription = "";
    Town = "";
    Location = "";
    ShowDate = new Date();
    DoorTime = null;
    StartTime = null;
    EndTime = null;
    TicketLink = null;
}
class EventProperties {
    Key = "";
    Value = "";
    IsHTML_Component = false;
}
let events = new Map();
document.addEventListener("DOMContentLoaded", InitPage);
function InitPage() {
    let excelLocationCSV = new URL("https://docs.google.com/spreadsheets/d/e/2PACX-1vRBjp_krL1yLMOpXHTfLsBMqD85ivI_aguisYMGJAk4ctP2fn2bSHobbjbZ3TEi2qs7BaxwaHuIQnEG/pub?output=csv");
    let localFile = new URL("/data/TestData.csv", window.origin);
    let fileURL = window.origin.indexOf("localhost") == -1 ? excelLocationCSV : localFile;
    let eventDataClient = new XMLHttpRequest();
    eventDataClient.onerror = function (e) { console.log(this, e, "Error"); };
    eventDataClient.onloadend = DataLoaded;
    eventDataClient.open("GET", fileURL);
    eventDataClient.send();
}
function ParseCsvFile(text) {
    let inQuotes = false;
    let textLines = [];
    textLines.push([]);
    let lineCount = 1;
    let itemStartIndex = 0;
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        let nextChar = text[i + 1];
        if (char == '"' && nextChar == '"') {
            i++;
        }
        else if (char == ',' && !inQuotes) {
            textLines[textLines.length - 1].push(text.substring(itemStartIndex, i));
            itemStartIndex = i + 1;
        }
        else if (char == '"') {
            inQuotes = !inQuotes;
        }
        else if (char == '\r' && nextChar == '\n' && !inQuotes) {
            lineCount++;
            textLines[textLines.length - 1].push(text.substring(itemStartIndex, i));
            textLines.push([]);
            itemStartIndex = i + 1;
            i++;
        }
        else if ((char == '\r' || char == '\n') && !inQuotes) {
            lineCount++;
            textLines[textLines.length - 1].push(text.substring(itemStartIndex, i));
            textLines.push([]);
            itemStartIndex = i + 1;
        }
    }
    textLines[textLines.length - 1].push(text.substring(itemStartIndex));
    for (let i = 0; i < textLines.length; i++) {
        for (let j = 0; j < textLines[i].length; j++) {
            let item = textLines[i][j].trim();
            let hasLineFeed = item.indexOf("\r") != -1;
            let hadNewLine = item.indexOf("\n") != -1;
            if (hadNewLine || hadNewLine) {
                item = item.substring(1, item.length - 1);
            }
            textLines[i][j] = item.replaceAll('""', '"');
        }
    }
    return textLines;
}
function DataLoaded(e) {
    let fileContent = this.responseText;
    let parsedContent = ParseCsvFile(fileContent);
    let showEventIndex = parsedContent[0].indexOf("Show Event");
    let titleIndex = parsedContent[0].indexOf("Title");
    let shortDescriptionIndex = parsedContent[0].indexOf("Short Description");
    let fullDescriptionIndex = parsedContent[0].indexOf("Full Description");
    let townIndex = parsedContent[0].indexOf("Town");
    let locationIndex = parsedContent[0].indexOf("Location");
    let dateIndex = parsedContent[0].indexOf("Date");
    let doorTimeIndex = parsedContent[0].indexOf("Door Time");
    let startTimeIndex = parsedContent[0].indexOf("Start Time");
    let endTimeIndex = parsedContent[0].indexOf("End Time");
    let ticketLinkIndex = parsedContent[0].indexOf("Ticket Link");
    let allEvent = [];
    for (let i = 1; i < parsedContent.length; i++) {
        let dataItem = parsedContent[i];
        let eventItem = new EventDetails();
        eventItem.ShowEvent = dataItem[showEventIndex] == "TRUE";
        eventItem.Title = dataItem[titleIndex];
        eventItem.ShortDescription = dataItem[shortDescriptionIndex];
        eventItem.FullDescription = dataItem[fullDescriptionIndex];
        eventItem.Town = dataItem[townIndex];
        eventItem.Location = dataItem[locationIndex];
        eventItem.ShowDate = parseDate(dataItem[dateIndex]);
        eventItem.DoorTime = parseTime(dataItem[doorTimeIndex], eventItem.ShowDate);
        eventItem.StartTime = parseTime(dataItem[startTimeIndex], eventItem.ShowDate);
        eventItem.EndTime = parseTime(dataItem[endTimeIndex], eventItem.ShowDate);
        try {
            eventItem.TicketLink = new URL(dataItem[ticketLinkIndex]);
        }
        catch {
            eventItem.TicketLink = null;
        }
        allEvent.push(eventItem);
    }
    allEvent = allEvent
        .filter((a) => { return a.ShowEvent; })
        .filter((a) => { return a.ShowDate.valueOf() > Date.now() - 24 * 60 * 60 * 1000; })
        .sort((a, b) => { return a.ShowDate.valueOf() - b.ShowDate.valueOf(); });
    createTable(allEvent);
    setupLocationDropdown(allEvent);
    for (let i = 0; i < allEvent.length; i++) {
        events.set(allEvent[i].ID, allEvent[i]);
    }
}
function parseDate(dateString) {
    let splitDates = dateString.split("/");
    let day = parseInt(splitDates[0]);
    let month = parseInt(splitDates[1]);
    let year = parseInt(splitDates[2]);
    return new Date(Date.UTC(year, month - 1, day));
}
function parseTime(timeString, baseDate) {
    let splitTimes = timeString.split(":");
    let hour = parseInt(splitTimes[0]);
    let minute = parseInt(splitTimes[1]);
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDay(), hour, minute);
}
function createTable(events) {
    let eventsContainer = document.getElementById("eventsContainer");
    let templateContainer = document.getElementById("eventItemTemplate");
    if (eventsContainer == null || templateContainer == null) {
        console.log("No container");
        return;
    }
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let copy = templateContainer.content.cloneNode(true);
        let eventProperies = [
            { IsHTML_Component: false, Key: "{{{ID}}}", Value: event.ID },
            { IsHTML_Component: false, Key: "{{{Title}}}", Value: event.Title },
            { IsHTML_Component: false, Key: "{{{Town}}}", Value: event.Town },
            { IsHTML_Component: false, Key: "{{{Location}}}", Value: event.Location },
            { IsHTML_Component: true, Key: "{{{ShortDescription}}}", Value: event.ShortDescription.replaceAll("\n", "<br//>") },
            { IsHTML_Component: true, Key: "{{{FullDescription}}}", Value: event.FullDescription.replaceAll("\n", "<br//>") },
            { IsHTML_Component: false, Key: "{{{StartTime}}}", Value: event.StartTime?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "" },
            { IsHTML_Component: false, Key: "{{{DoorTime}}}", Value: event.DoorTime?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "" },
            { IsHTML_Component: false, Key: "{{{EndTime}}}", Value: event.EndTime?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "" },
            { IsHTML_Component: false, Key: "{{{Month}}}", Value: event.ShowDate.toLocaleDateString("en-Gb", { month: "short" }).toLocaleUpperCase() },
            { IsHTML_Component: false, Key: "{{{Day}}}", Value: event.ShowDate.toLocaleDateString("en-Gb", { day: "2-digit" }).toLocaleUpperCase() },
            { IsHTML_Component: false, Key: "{{{Weekday}}}", Value: event.ShowDate.toLocaleDateString("en-Gb", { weekday: "short" }).toLocaleUpperCase() },
        ];
        setupTemplateValues(copy, eventProperies);
        setupTemplateInfoButton(copy);
        setupTemplateTicketLink(copy, event.TicketLink?.href ?? "");
        setupTemplateID(copy, event.ID);
        eventsContainer.append(copy);
    }
}
function setupLocationDropdown(events) {
    let element = document.getElementById("eventLocationSelector");
    if (element == null) {
        return;
    }
    let dropdownElement = element;
    let allTowns = new Set(events.map((a) => a.Town).sort());
    allTowns.forEach((town) => {
        let option = document.createElement("option");
        option.text = town;
        option.value = town;
        dropdownElement.options.add(option);
    });
    dropdownElement.addEventListener("change", onLocationSelected);
}
function onLocationSelected(ev) {
    let eventItems = document.getElementsByClassName("eventItem");
    for (let i = 0; i < eventItems.length; i++) {
        let event = events.get(eventItems[i].id);
        if (event == undefined) {
            continue;
        }
        let isVisible = event.Town == this.value || this.value == "";
        if (isVisible) {
            eventItems[i].classList.remove("eventHidden");
        }
        else {
            eventItems[i].classList.add("eventHidden");
        }
    }
}
function setupTemplateValues(node, eventProperies) {
    for (let i = 0; i < node.childNodes.length; i++) {
        let textNode = node.childNodes[i];
        setupTemplateValues(textNode, eventProperies);
        if (textNode.nodeType != Node.TEXT_NODE) {
            continue;
        }
        if (textNode.nodeValue == null) {
            continue;
        }
        for (let j = 0; j < eventProperies.length; j++) {
            if (textNode.nodeValue.indexOf(eventProperies[j].Key) == -1) {
                continue;
            }
            if (eventProperies[j].IsHTML_Component) {
                let newElement = document.createElement("div");
                newElement.innerHTML = eventProperies[j].Value;
                if (textNode.parentElement != null) {
                    textNode.parentElement.innerHTML = eventProperies[j].Value;
                }
            }
            else {
                textNode.nodeValue = textNode.nodeValue?.replace(eventProperies[j].Key, eventProperies[j].Value);
            }
        }
    }
}
function setupTemplateID(node, id) {
    for (let i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType != Node.ELEMENT_NODE) {
            continue;
        }
        node.childNodes[i].id = id;
    }
}
function setupTemplateInfoButton(node) {
    for (let i = 0; i < node.childNodes.length; i++) {
        let elementNode = node.childNodes[i];
        setupTemplateInfoButton(elementNode);
        if (elementNode.nodeType != Node.ELEMENT_NODE) {
            continue;
        }
        let element = elementNode;
        if (!element.classList.contains("eventToggleInformation")) {
            continue;
        }
        element.addEventListener("click", changeViewElement);
    }
}
function setupTemplateTicketLink(node, url) {
    for (let i = 0; i < node.childNodes.length; i++) {
        let elementNode = node.childNodes[i];
        setupTemplateTicketLink(elementNode, url);
        if (elementNode.nodeType != Node.ELEMENT_NODE) {
            continue;
        }
        let element = elementNode;
        if (!element.classList.contains("eventTicketLink")) {
            continue;
        }
        element.href = url;
    }
}
function changeViewElement(event) {
    let parentElement = this.closest(".eventItem");
    if (parentElement == null) {
        return;
    }
    let isSmallView = parentElement.classList.contains("eventShort");
    if (isSmallView) {
        parentElement.classList.replace("eventShort", "eventFull");
        this.innerText = "▲▲▲ Less Information ▲▲▲";
    }
    else {
        parentElement.classList.replace("eventFull", "eventShort");
        this.innerText = "▼▼▼ More Information ▼▼▼";
    }
}
