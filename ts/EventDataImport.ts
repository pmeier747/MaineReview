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

let events: Map<string, EventDetails> = new Map();

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

function ParseCsvFile(text: string): string[][] {
    let inQuotes: boolean = false;
    let textLines: string[][] = [];
    textLines.push([]);
    let lineCount: number = 1;

    let itemStartIndex = 0;

    for (let i: number = 0; i < text.length; i++) {
        let char: string = text[i];
        let nextChar: string | undefined = text[i + 1]

        if (char == '"' && nextChar == '"') {
            i++;
        }
        else if (char == ',' && !inQuotes) {
            textLines[textLines.length - 1].push(text.substring(itemStartIndex, i));
            itemStartIndex = i+1;
        }
        else if (char == '"') {
            inQuotes = !inQuotes;
        }
        else if(char == '\r' && nextChar == '\n' && !inQuotes) {
            lineCount++;
            textLines[textLines.length - 1].push(text.substring(itemStartIndex, i));
            textLines.push([]);
            itemStartIndex = i+1;
            i++;
        }
        else if((char == '\r' || char == '\n') && !inQuotes) {
            lineCount++;
            textLines[textLines.length - 1].push(text.substring(itemStartIndex, i));
            textLines.push([]);
            itemStartIndex = i+1;
        }
    }

    textLines[textLines.length - 1].push(text.substring(itemStartIndex));

    for (let i: number = 0; i < textLines.length; i++) {
        for (let j: number = 0; j < textLines[i].length; j++) {
            let item: string = textLines[i][j].trim();
            let hasLineFeed: boolean = item.indexOf("\r") != -1;
            let hadNewLine: boolean = item.indexOf("\n") != -1;

            if (hadNewLine || hadNewLine) {
                item = item.substring(1, item.length - 1);
            }
            textLines[i][j] = item.replaceAll('""', '"');
        }
    }

    return textLines;
}

function DataLoaded(this: XMLHttpRequest, e: ProgressEvent<EventTarget>) {
    let fileContent: string = this.responseText;
    let parsedContent: string[][] = ParseCsvFile(fileContent);

    let showEventIndex: number = parsedContent[0].indexOf("Show Event");
    let titleIndex: number = parsedContent[0].indexOf("Title");
    let shortDescriptionIndex: number = parsedContent[0].indexOf("Short Description");
    let fullDescriptionIndex: number = parsedContent[0].indexOf("Full Description");
    let townIndex: number = parsedContent[0].indexOf("Town");
    let locationIndex: number = parsedContent[0].indexOf("Location");
    let dateIndex: number = parsedContent[0].indexOf("Date");
    let doorTimeIndex: number = parsedContent[0].indexOf("Door Time");
    let startTimeIndex: number = parsedContent[0].indexOf("Start Time");
    let endTimeIndex: number = parsedContent[0].indexOf("End Time");
    let ticketLinkIndex: number = parsedContent[0].indexOf("Ticket Link");

    let allEvent: EventDetails[] = []
    for (let i: number = 1; i < parsedContent.length; i++) {
        let dataItem: string[] = parsedContent[i];
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

    allEvent = allEvent
        .filter((a) => { return a.ShowEvent; })
        .filter((a) => { return a.ShowDate.valueOf() > Date.now() - 24 * 60 * 60 * 1000; })
        .sort((a, b) => { return a.ShowDate.valueOf() - b.ShowDate.valueOf();});

    createTable(allEvent);
    setupLocationDropdown(allEvent);

    for (let i = 0; i < allEvent.length; i++) {
        events.set(allEvent[i].ID, allEvent[i]);
    }
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
        setupTemplateTicketLink(copy, event.TicketLink?.href ?? "");
        setupTemplateID(copy, event.ID);

        eventsContainer.append(copy);
    }
}

function setupLocationDropdown(events: EventDetails[]): void {
    let element : HTMLElement | null = document.getElementById("eventLocationSelector");
    if (element == null) { return; }

    let dropdownElement : HTMLSelectElement = element as HTMLSelectElement;
    let allTowns: Set<string> = new Set(events.map((a) => a.Town).sort());
    allTowns.forEach(
        (town: string) => {
            let option: HTMLOptionElement = document.createElement("option");
            option.text = town;
            option.value = town;
            dropdownElement.options.add(option);
        }
    );

    dropdownElement.addEventListener("change", onLocationSelected)
}

function onLocationSelected(this: HTMLSelectElement, ev: Event): void {
    let eventItems: HTMLCollectionOf<Element> = document.getElementsByClassName("eventItem");

    for (let i = 0; i < eventItems.length; i++) {
        let event: EventDetails | undefined = events.get(eventItems[i].id);
        if (event == undefined) { continue; }

        let isVisible: boolean = event.Town == this.value || this.value == "";
        if (isVisible) {
            eventItems[i].classList.remove("eventHidden");
        }
        else {
            eventItems[i].classList.add("eventHidden");
        }
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

function setupTemplateID(node: Node, id: string) {
    for (let i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType != Node.ELEMENT_NODE) { continue; }
        
        (node.childNodes[i] as HTMLElement).id = id;
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