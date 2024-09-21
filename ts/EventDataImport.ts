class EventDetails {
    public ID: `${string}-${string}-${string}-${string}-${string}` = crypto.randomUUID();
    public ShowEvent: boolean = false;
    public Title: string = "";
    public ShortDescription: string = "";
    public FullDescription: string = "";
    public Town: string = "";
    public Location: string = "";
    public ShowDate: Date | null = null;
    public DoorTime: Date | null = null;
    public StartTime: Date | null = null;
    public EndTime: Date | null = null;
    public TicketLink: URL | null = null;
    public IsAccessible: boolean = false;
    public Category: string = "";

    public isValid(): boolean {
        if (this.ShowEvent == false) { return false; }
        if (this.ShowDate == null || isNaN(this.ShowDate.valueOf())) { return false; }
        if (this.StartTime == null || isNaN(this.StartTime.valueOf())) { return false; }

        return true;
    }

    public getDurationString(): string {
        if (this.StartTime == null || isNaN(this.StartTime.valueOf())) { return ""; }
        if (this.EndTime == null || isNaN(this.EndTime.valueOf())) { return ""; }

        let duration: number = this.EndTime.valueOf() - this.StartTime.valueOf();
        if (duration <= 0) { return ""; }

        let hours: number = Math.floor(duration / (1000 * 60 * 60));
        let minutes: number = (duration / (1000 * 60)) % 60;

        if (hours == 0) {
            return `${minutes}m`;
        }
        else if (minutes != 0) {
            return `${hours}h${minutes}m`;
        }
        else {
            return `${hours}h`;
        }
    }
}

class EventProperties {
    public Key: string = "";
    public Value: string = "";
    public IsHTML_Component: boolean = false;
}

let events: Map<string, EventDetails> = new Map();

document.addEventListener("DOMContentLoaded", InitPage);

function InitPage(): void {
    let excelLocationCSV: URL = new URL("https://docs.google.com/spreadsheets/d/e/2PACX-1vTwMMh_Gao8oLZ89EPf6pAA2ftTJa4uqeDAHTeAQyfTbbo9gHyDVsoN5JUDh6-P_hzLsxPJnvLR0hmT/pub?gid=899861774&single=true&output=csv");
    let localFile: URL = new URL("/data/Ireland Improv Events - Form Responses.csv", window.origin);
    let fileURL: URL = window.origin.indexOf("localhost") != -1 ? excelLocationCSV : localFile;

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

    for (let i: number = 0; i < textLines.length; i++) {
        for (let j: number = 0; j < textLines[i].length; j++) {
            let item: string = textLines[i][j].trim();
            let hasLineFeed: boolean = item.indexOf("\r") != -1;
            let hadNewLine: boolean = item.indexOf("\n") != -1;

            if (hadNewLine || hasLineFeed) {
                item = item.substring(1, item.length - 1);
            }
            else if (item[0] == "\"" && item[item.length - 1] == "\"") {
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

    let showEventIndex: number = parsedContent[0].indexOf("Display Event");
    let titleIndex: number = parsedContent[0].indexOf("Title of the Event");
    let shortDescriptionIndex: number = parsedContent[0].indexOf("Short Description");
    let fullDescriptionIndex: number = parsedContent[0].indexOf("Long Description");
    let townIndex: number = parsedContent[0].indexOf("Location (City/Town)");
    let locationIndex: number = parsedContent[0].indexOf("Location (Venue)");
    let dateIndex: number = parsedContent[0].indexOf("Event Date");
    let doorTimeIndex: number = parsedContent[0].indexOf("Door Time");
    let startTimeIndex: number = parsedContent[0].indexOf("Start Time");
    let endTimeIndex: number = parsedContent[0].indexOf("End Time");
    let ticketLinkIndex: number = parsedContent[0].indexOf("Ticket Link");
    let accessibleIndex: number = parsedContent[0].indexOf("Venue Accessible?");
    let categoryIndex: number = parsedContent[0].indexOf("Event Category");

    let allEvent: EventDetails[] = []
    for (let i: number = 1; i < parsedContent.length; i++) {
        let dataItem: string[] = parsedContent[i];
        let eventItem: EventDetails = new EventDetails();
        eventItem.ShowEvent = dataItem[showEventIndex]?.toUpperCase() == "TRUE";
        eventItem.Title = dataItem[titleIndex] ?? "";
        eventItem.ShortDescription = dataItem[shortDescriptionIndex] ?? "";
        eventItem.FullDescription = dataItem[fullDescriptionIndex] ?? "";
        eventItem.Town = dataItem[townIndex] ?? "";
        eventItem.Location = dataItem[locationIndex] ?? "";
        eventItem.ShowDate = parseDate(dataItem[dateIndex]);
        eventItem.DoorTime = parseTime(dataItem[doorTimeIndex], eventItem.ShowDate ?? new Date());
        eventItem.StartTime = parseTime(dataItem[startTimeIndex], eventItem.ShowDate ?? new Date());
        eventItem.EndTime = parseTime(dataItem[endTimeIndex], eventItem.ShowDate ?? new Date());
        try {
            eventItem.TicketLink = new URL(dataItem[ticketLinkIndex]);
        }
        catch {
            eventItem.TicketLink = null;
        }
        eventItem.IsAccessible = dataItem[accessibleIndex]?.toUpperCase() == "YES";
        eventItem.Category = dataItem[categoryIndex] ?? "";

        allEvent.push(eventItem);
    }

    allEvent = allEvent
        .filter((a) => { return a.isValid(); })
        .filter((a) => { return a.ShowDate!.valueOf() > Date.now() - (8 * 60 * 60 * 1000); })
        .sort((a, b) => { return a.ShowDate!.valueOf() - b.ShowDate!.valueOf(); });

    createTable(allEvent);
    setupLocationDropdown(allEvent);

    for (let i = 0; i < allEvent.length; i++) {
        events.set(allEvent[i].ID, allEvent[i]);
    }
}

function parseDate(dateString: string | null): Date | null {
    let splitDates: string[] = (dateString ?? "").split("/");
    let day: number = parseInt(splitDates[1]);
    let month: number = parseInt(splitDates[0]);
    let year: number = parseInt(splitDates[2]);

    return new Date(Date.UTC(year, month - 1, day));
}

function parseTime(timeString: string | null, baseDate: Date): Date | null {
    let splitTimes: string[] = (timeString ?? "").split(":");
    let hour: number = parseInt(splitTimes[0]);
    let minute: number = parseInt(splitTimes[1]);
    let isPM: boolean = (splitTimes[2] ?? "").toLocaleUpperCase().endsWith("PM");
    if (isPM) { hour += 12; }

    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDay(), hour, minute);
}

function createTable(events: EventDetails[]): void {
    let eventsContainer: HTMLDivElement | null = document.getElementById("eventsContainer") as HTMLDivElement;
    let templateContainer: HTMLTemplateElement | null = document.getElementById("eventItemTemplate") as HTMLTemplateElement;
    if (eventsContainer == null || templateContainer == null) {
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
            { IsHTML_Component: true, Key: "{{{FullDescription}}}", Value: event.FullDescription.trim() != "" ? event.FullDescription.replaceAll("\n", "<br//>") : event.ShortDescription.replaceAll("\n", "<br//>") },
            { IsHTML_Component: false, Key: "{{{StartTime}}}", Value: event.StartTime?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "" },
            { IsHTML_Component: false, Key: "{{{DoorTime}}}", Value: event.DoorTime?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "" },
            { IsHTML_Component: false, Key: "{{{EndTime}}}", Value: event.getDurationString() },
            { IsHTML_Component: false, Key: "{{{Month}}}", Value: event.ShowDate?.toLocaleDateString("en-Gb", { month: "short" }).toLocaleUpperCase() ?? "" },
            { IsHTML_Component: false, Key: "{{{Day}}}", Value: event.ShowDate?.toLocaleDateString("en-Gb", { day: "2-digit" }).toLocaleUpperCase() ?? "" },
            { IsHTML_Component: false, Key: "{{{Weekday}}}", Value: event.ShowDate?.toLocaleDateString("en-Gb", { weekday: "short" }).toLocaleUpperCase() ?? "" },
            { IsHTML_Component: false, Key: "{{{eventTicketLinkOption}}}", Value: event.TicketLink == null ? "eventNoLink" : "eventLink"},
            { IsHTML_Component: false, Key: "{{{doorTagVisible}}}", Value: (event.DoorTime == null || isNaN(event.DoorTime.valueOf())) ? "tagHidden" : "tagVisible" },
            { IsHTML_Component: false, Key: "{{{durationTagVisible}}}", Value: (event.getDurationString().trim() == "") ? "tagHidden" : "tagVisible" },
            { IsHTML_Component: false, Key: "{{{locationTagVisible}}}", Value: event.Location.trim() == "" ? "tagHidden" : "tagVisible" },
            { IsHTML_Component: false, Key: "{{{categoryTagVisible}}}", Value: event.Category.trim() == "" ? "tagHidden" : "tagVisible" },
            { IsHTML_Component: false, Key: "{{{accessibleTagVisible}}}", Value: !event.IsAccessible ? "tagHidden" : "tagVisible" },
            { IsHTML_Component: false, Key: "{{{Category}}}", Value: event.Category },
        ];

        setupTemplateValues(copy, eventProperies);
        setupTemplateInfoButton(copy);
        setupTemplateTicketLink(copy, event.TicketLink?.href ?? "");
        setupTemplateID(copy, event.ID);

        eventsContainer.append(copy);
    }
}

function setupLocationDropdown(events: EventDetails[]): void {
    let element: HTMLElement | null = document.getElementById("eventLocationSelector");
    if (element == null) { return; }

    let dropdownElement: HTMLSelectElement = element as HTMLSelectElement;
    let allTowns: Set<string> = new Set(
        events.map((a) => a.Town.trim()).sort((a, b) => a.toLocaleLowerCase().localeCompare(b))
    );
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

        if (textNode.nodeType == Node.TEXT_NODE) {
            if (textNode.nodeValue == null) { continue; }

            for (let j: number = 0; j < eventProperies.length; j++) {
                if (textNode.nodeValue.indexOf(eventProperies[j].Key) == -1) { continue; }

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
        else if (textNode.nodeType == Node.ELEMENT_NODE) {
            let node: HTMLElement = textNode as HTMLElement;

            for (let j: number = 0; j < eventProperies.length; j++) {
                if (!node.classList.contains(eventProperies[j].Key)) { continue; }

                node.classList.replace(eventProperies[j].Key, eventProperies[j].Value);
            }
            node.classList.contains
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

function changeViewElement(this: HTMLElement, event: MouseEvent): void {
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