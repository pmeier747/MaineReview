class EventDetails {
    public ID: `${string}-${string}-${string}-${string}-${string}` = crypto.randomUUID();
    public ShowEvent: boolean = false;
    public Title: string = "";
    public ShortDescription: string = "";
    public FullDescription: string = "";
    public Town: string = "";
    public Location: string = "";
    public ShowDate: Date = new Date();
    public DoorTime: Date | null = null;
    public StartTime: Date | null = null;
    public EndTime: Date | null = null;
    public TicketLink: URL | null = null;
}

class EventProperties {
    public Key: string = "";
    public Value: string = "";
    public IsHTML_Component: boolean = false;
}

document.addEventListener("DOMContentLoaded", InitPage);

function InitPage(): void {
    let excelLocationCSV: URL = new URL("https://docs.google.com/spreadsheets/d/e/2PACX-1vRBjp_krL1yLMOpXHTfLsBMqD85ivI_aguisYMGJAk4ctP2fn2bSHobbjbZ3TEi2qs7BaxwaHuIQnEG/pub?output=csv");
    let localFile: URL = new URL("/data/TestData.csv", window.origin);
    let fileURL: URL = window.origin.indexOf("localhost") == -1 ? excelLocationCSV : localFile;

    let eventDataClient: XMLHttpRequest = new XMLHttpRequest();
    eventDataClient.onerror = function (this: XMLHttpRequest, e: ProgressEvent<EventTarget>) { console.log(this, e, "Error"); }
    eventDataClient.onloadend = DataLoaded;
    eventDataClient.open("GET", fileURL);
    eventDataClient.send();
}

function DataLoaded(this: XMLHttpRequest, e: ProgressEvent<EventTarget>) {
    let fileContent: string = this.responseText;
    let firstNewLine: number = fileContent.indexOf("\r\n");
    let header: string = fileContent.substring(0, firstNewLine);

    let headerItems: string[] = header.split(",");

    let body: string = fileContent.substring(firstNewLine + 2);
    let bodyItems: string[] = body.split("\r\n");

    let formattedBodyItems: string[][] = [];
    for (let i: number = 0; i < bodyItems.length; i++) {
        let individualItems: string[] = bodyItems[i].split(",");
        let finalItems: string[] = [];
        let itemToAdd: string = "";
        let inSubString: boolean = false;
        for (let j = 0; j < individualItems.length; j++) {
            let currentItem: string = individualItems[j];
            if (!inSubString) {
                itemToAdd = currentItem;
            }
            else {
                itemToAdd += currentItem;
                if (currentItem.charAt(currentItem.length - 1) == "\"") {
                    inSubString = false;
                }
                else {
                    continue;
                }
            }

            if (currentItem.charAt(0) == "\"") {
                inSubString = true;
                continue;
            }

            finalItems.push(itemToAdd);
            itemToAdd = "";
            inSubString = false;
        }
        formattedBodyItems.push(finalItems);
    }

    let showEventIndex: number = headerItems.indexOf("Show Event");
    let titleIndex: number = headerItems.indexOf("Title");
    let shortDescriptionIndex: number = headerItems.indexOf("Short Description");
    let fullDescriptionIndex: number = headerItems.indexOf("Full Description");
    let townIndex: number = headerItems.indexOf("Town");
    let locationIndex: number = headerItems.indexOf("Location");
    let dateIndex: number = headerItems.indexOf("Date");
    let doorTimeIndex: number = headerItems.indexOf("Door Time");
    let startTimeIndex: number = headerItems.indexOf("Start Time");
    let endTimeIndex: number = headerItems.indexOf("End Time");
    let ticketLinkIndex: number = headerItems.indexOf("Ticket Link");

    let allEvent: EventDetails[] = []
    for (let i: number = 0; i < formattedBodyItems.length; i++) {
        let dataItem: string[] = formattedBodyItems[i];
        let eventItem: EventDetails = new EventDetails();
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

    createTable(allEvent);
}

function parseDate(dateString: string): Date {
    let splitDates: string[] = dateString.split("/");
    let day: number = parseInt(splitDates[0]);
    let month: number = parseInt(splitDates[1]);
    let year: number = parseInt(splitDates[2]);

    return new Date(Date.UTC(year, month - 1, day));
}

function parseTime(timeString: string, baseDate: Date): Date {
    let splitTimes: string[] = timeString.split(":");
    let hour: number = parseInt(splitTimes[0]);
    let minute: number = parseInt(splitTimes[1]);

    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDay(), hour, minute);
}

function createTable(events: EventDetails[]): void {
    let eventsContainer: HTMLDivElement | null = document.getElementById("eventsContainer") as HTMLDivElement;
    let templateContainer: HTMLTemplateElement | null = document.getElementById("eventItemTemplate") as HTMLTemplateElement;
    if (eventsContainer == null || templateContainer == null) {
        console.log("No container");
        return;
    }

    for (let i: number = 0; i < events.length; i++) {
        let event: EventDetails = events[i];
        if (event.ShowEvent == false) { continue; }

        let copy: Node = templateContainer.content.cloneNode(true);

        let eventProperies: EventProperties[] = [
            { IsHTML_Component: false, Key: "{{{ID}}}", Value: event.ID },
            { IsHTML_Component: false, Key: "{{{Title}}}", Value: event.Title },
            { IsHTML_Component: false, Key: "{{{Town}}}", Value: event.Town },
            { IsHTML_Component: false, Key: "{{{Location}}}", Value: event.Location },
            { IsHTML_Component: true, Key: "{{{ShortDescription}}}", Value: event.ShortDescription.replaceAll("\n", "<br//>") },
            { IsHTML_Component: true, Key: "{{{FullDescription}}}", Value: event.FullDescription.replaceAll("\n", "<br//>") },
            { IsHTML_Component: false, Key: "{{{StartTime}}}", Value: event.StartTime?.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", hour12: false}) ?? "" },
            { IsHTML_Component: false, Key: "{{{DoorTime}}}", Value: event.DoorTime?.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", hour12: false}) ?? "" },
            { IsHTML_Component: false, Key: "{{{EndTime}}}", Value: event.EndTime?.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", hour12: false}) ?? "" },
            { IsHTML_Component: false, Key: "{{{Month}}}", Value: event.ShowDate.toLocaleDateString("en-Gb", {month: "short"}).toLocaleUpperCase() },
            { IsHTML_Component: false, Key: "{{{Day}}}", Value: event.ShowDate.toLocaleDateString("en-Gb", {day: "2-digit"}).toLocaleUpperCase() },
            { IsHTML_Component: false, Key: "{{{Weekday}}}", Value: event.ShowDate.toLocaleDateString("en-Gb", {weekday: "short"}).toLocaleUpperCase() },
        ];

        setupTemplateValues(copy, eventProperies);
        setupTemplateInfoButton(copy);
        setupTemplateTicketLink(copy, event.TicketLink?.href ?? "")

        eventsContainer.append(copy);
    }
}

function setupTemplateValues(node: Node, eventProperies: EventProperties[]): void {
    for (let i: number = 0; i < node.childNodes.length; i++) {
        let textNode: Node = node.childNodes[i];
        setupTemplateValues(textNode, eventProperies);

        if (textNode.nodeType != Node.TEXT_NODE) { continue; }
        if (textNode.nodeValue == null) { continue; }
        
        for (let j: number = 0; j < eventProperies.length; j++) {
            if (textNode.nodeValue.indexOf(eventProperies[j].Key) == -1) { continue;}
            
            if (eventProperies[j].IsHTML_Component) {
                let newElement: HTMLDivElement = document.createElement("div");
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

function setupTemplateInfoButton(node: Node): void {
    for (let i: number = 0; i < node.childNodes.length; i++) {
        let elementNode: Node = node.childNodes[i];
        setupTemplateInfoButton(elementNode);

        if (elementNode.nodeType != Node.ELEMENT_NODE) { continue; }
        let element: HTMLElement = elementNode as HTMLElement;
        if (!element.classList.contains("eventToggleInformation")) { continue; }

        element.addEventListener("click", changeViewElement);
    }
}

function setupTemplateTicketLink(node: Node, url: string): void {
    for (let i: number = 0; i < node.childNodes.length; i++) {
        let elementNode: Node = node.childNodes[i];
        setupTemplateTicketLink(elementNode, url);

        if (elementNode.nodeType != Node.ELEMENT_NODE) { continue; }
        let element: HTMLAnchorElement = elementNode as HTMLAnchorElement;
        if (!element.classList.contains("eventTicketLink")) { continue; }

        element.href = url;
    }
}

function changeViewElement(this: HTMLElement, event: MouseEvent) : void {
    let parentElement: Element | null = this.closest(".eventItem");
    if (parentElement == null) { return; }

    let isSmallView: boolean = parentElement.classList.contains("eventShort")
    if (isSmallView) {
        parentElement.classList.replace("eventShort", "eventFull");
        this.innerText = "▲▲▲ Less Information ▲▲▲";
    }
    else {
        parentElement.classList.replace("eventFull", "eventShort");
        this.innerText = "▼▼▼ More Information ▼▼▼";
    }
}