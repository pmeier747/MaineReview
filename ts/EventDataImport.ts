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
    if (eventsContainer == null) {
        console.log("No container");
        return;
    }

    for (let i: number = 0; i < events.length; i++) {
        let event: EventDetails = events[i];
        if (event.ShowEvent == false) { continue; }
        
        let elem: HTMLDivElement = document.createElement("div");
        elem.id = event.ID;
        elem.className = "eventElement"
        elem.classList.add("smallView");

        elem.append(createShowDateElement(event));



        // addDivElement(elem, event.ID, "eventID");
        addDivElement(elem, event.Title, "eventTitle");
        addDivElement(elem, event.Town, "eventTown");
        addDivElement(elem, event.Location, "eventLocation");
        addDivElement(elem, event.ShortDescription.replaceAll("\n", "<br/>"), "eventShortDescription", true);
        addDivElement(elem, event.FullDescription.replaceAll("\n", "<br/>"), "eventFullDescription", true);
        // addDivElement(elem, event.ShowDate.toLocaleDateString("en-GB", {day: "2-digit"}) + "<br/>" + event.ShowDate.toLocaleDateString("en-GB", { month: "short"}).toLocaleUpperCase("en-GB"), "eventDate", true);
        addDivElement(elem, event.StartTime?.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", hour12: true}) ?? "", "eventStartTime");
        addDivElement(elem, event.DoorTime?.toLocaleTimeString("en-GB", {hour: "numeric", minute: "2-digit", hour12: true}) ?? "", "eventDoorTime");
        addDivElement(elem, event.EndTime?.toLocaleTimeString("en-GB", {hour: "numeric", minute: "2-digit", hour12: true}) ?? "", "eventEndTime");
        // addDivElement(elem, event.TicketLink?.toString() ?? "", "eventURL");
        addDivElement(elem, "TICKETS", "eventURL");
        addDivElement(elem, "More Info", "eventInfo");
        // addDivElement(elem, "LOGO", "eventLogo");
        
        eventsContainer.append(elem);
    }
    let elem: HTMLDivElement = document.createElement("div");
}

function addDivElement(element: HTMLElement, text: string, className: string, isHTML: boolean = false): void {
    let divElement: HTMLDivElement = document.createElement("div");
    if (isHTML) {
        divElement.innerHTML = text;
    }
    else {
        divElement.textContent = text;
    }
    divElement.className = className;
    element.append(divElement);
}

function createShowDateElement(event: EventDetails) : HTMLDivElement
{
    let showElement: HTMLDivElement = document.createElement("div");
    showElement.classList.add("eventDate")

    let monthElement: HTMLDivElement = document.createElement("div");
    monthElement.innerText = event.ShowDate.toLocaleDateString("en-Gb", {month: "short"}).toLocaleUpperCase();
    monthElement.classList.add("eventMonth")
    showElement.append(monthElement);

    let dayElement: HTMLDivElement = document.createElement("div");
    dayElement.innerText = event.ShowDate.toLocaleDateString("en-Gb", {day: "2-digit"}).toLocaleUpperCase();
    dayElement.classList.add("eventDay")
    showElement.append(dayElement);

    let weekdayElement: HTMLDivElement = document.createElement("div");
    weekdayElement.innerText = event.ShowDate.toLocaleDateString("en-Gb", {weekday: "short"}).toLocaleUpperCase();
    weekdayElement.classList.add("eventWeekday")
    showElement.append(weekdayElement);

    let timeElement: HTMLDivElement = document.createElement("div");
    timeElement.innerText = event.StartTime?.toLocaleTimeString("en-Gb", {hour: "2-digit", minute: "2-digit"}).toLocaleUpperCase() ?? "";
    timeElement.classList.add("eventTime")
    showElement.append(timeElement);

    return showElement;
}