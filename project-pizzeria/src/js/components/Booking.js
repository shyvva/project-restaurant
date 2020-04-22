import { select, settings, templates, classNames } from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';


class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.renderOnSite(element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.makeReserved();
    thisBooking.initActions();
  }

  getData() {
    const thisBooking = this;
    /* set start date parameters to construct urls that will be later used to get data from API */
    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    /* set end date parameters to construct urls that will be later used to get data from API */
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    /* Create const that stores parameters of bookings and events */
    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };

    /* Make urls object that stores API endpoint address containing list of bookings and events */
    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat.join('&'),

    };

    /* use Promise.all to execute function defined in then only when all fetch actions are completed */
    Promise.all([
      /* fetch data from API */
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
      /* Promise.all returns an array allResponses */
    ]).then(function (allResponses) {
      const bookingsResponse = allResponses[0];
      const eventsCurrentResponse = allResponses[1];
      const eventsRepeatResponse = allResponses[2];
      /* return parsed data (in json format) */
      return Promise.all([
        bookingsResponse.json(),
        eventsCurrentResponse.json(),
        eventsRepeatResponse.json(),
      ]);
      /* save first element of array from previous function as booking const, second as eventsCurrent and third as eventsRepeat */
    }).then(function ([bookings, eventsCurrent, eventsRepeat]) {
      thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
    });
  }

  /* Creates a local object containing booking data, so that data does not have to be checked in API each time user use hour slider or picks date */
  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;
    /* Create empty object that will later contain data downloaded from API */
    thisBooking.booked = {};

    /* Start loop for each booking */
    for (let item of bookings) {
      /* saves booking data to thisBooking.booked object using makeBooked method */
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    /* Start loop for each one-time event */
    for (let item of eventsCurrent) {
      /* saves one time event data to thisBooking.booked object using makeBooked method */
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    /* Get selected date from datePicker */
    const minDate = thisBooking.datePicker.minDate;
    /* Max date calculated as selected date + 14 days - also from datePicker */
    const maxDate = thisBooking.datePicker.maxDate;

    /* Start loop for each repeating event */
    for (let item of eventsRepeat) {
      /* check if event is repeating type */
      if (item.repeat == 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          /* saves repeating event data to thisBooking.booked object using makeBooked method */
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    thisBooking.updateDOM();
  }
  /* Method that saves booking and event data to object thisBooking.booked */
  makeBooked(date, hour, duration, table) {
    const thisBooking = this;
    /* If there is no booking for a selected date then create an empty object */
    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }
    /* convert selected start hour - e.g. 12:30 from API - to number we need in thisBooking.booked object - 12.5 */
    const startHour = utils.hourToNumber(hour);

    /* Loop to book a table for entire duration of the booking, not just the starting hour */
    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      /* If there is no booking for the hour block yet, create empty array */
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }
      /* For each hour block append table number to array in thisBooking.booked object */
      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    /* save date and hour to thisBooking object based on datePicker and hourPicker inputs */
    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    /* Constant that indicates that on the particular date and hour all tables are available */
    let allAvailable = false;

    /* if for selected date there is no object or for selected date and hour there is no array it means that all tables are available */
    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ) {
      allAvailable = true;
    }

    /* Start loop for each table from tables visible on the booking tab */
    for (let table of thisBooking.dom.tables) {
      /* set table Id from 'data-table' html attribute - will always be a string */
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      /* check if tableId is a number */
      if (!isNaN(tableId)) {
        /* convert string to integer */
        tableId = parseInt(tableId);
      }
      /* if not all tables are available and selected table is booked for selected date and hour */
      if (
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {
        /* add class 'booked' to the booked table */
        table.classList.add(classNames.booking.tableBooked);
      } else {
        /* remove class 'booked' from selected table */
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  makeReserved() {
    const thisBooking = this;
    /* define constant with all tables in restaurant */
    const tables = thisBooking.dom.tables;
    /* Check if any table is clicked */
    for (let table of tables) {
      table.addEventListener('click', function (event) {
        event.preventDefault();
        /* if table is not booked yet */
        if (!table.classList.contains(classNames.booking.tableBooked)) {
          /* Add class reserved - not booked, so that table has different color */
          table.classList.toggle(classNames.booking.tableReserved);
          /* get table attribute - number */
          thisBooking.reservedTable = parseInt(table.getAttribute(settings.booking.tableIdAttribute));
          /* if table is already booked */
        } else {
          return alert('This table is not available');
        }

        const allReservedTables = document.querySelectorAll(select.booking.tablesReserved);
        /* This code prevents selecting multiple tables */
        for (let reservedTable of allReservedTables) {
          if (reservedTable !== table) {
            reservedTable.classList.remove(classNames.booking.tableReserved);
          }
        }
      });
      /* Event listener to remove reserved class from table when date input is updated by user */
      thisBooking.dom.datePicker.addEventListener('updated', function () {
        table.classList.remove(classNames.booking.tableReserved);
      });
      /* Event listener to remove reserved class from table when hour slider is updated by user */
      thisBooking.dom.hourPicker.addEventListener('updated', function () {
        table.classList.remove(classNames.booking.tableReserved);
      });
    }

    thisBooking.starters = [];

    const starters = thisBooking.dom.starters;
    /* Add checked starter to thisBooking.starters or remove it if un-checked */
    for (let starter of starters) {
      starter.addEventListener('change', function () {
        if (this.checked) {
          thisBooking.starters.push(starter.value);
        } else {
          thisBooking.starters.splice(thisBooking.starters.indexOf(starter.value, 1));
        }
      });
    }
  }

  /* Complete all booking data in one object and send to API */
  sendBooking() {
    const thisBooking = this;

    /* const with url of appropriate API endpoint */
    const url = settings.db.url + '/' + settings.db.booking;

    /* Object (booking) being sent to API */
    const reservation = {
      id: '',
      date: thisBooking.datePicker.dom.input.value,
      hour: thisBooking.hourPicker.value,
      table: parseInt(thisBooking.reservedTable),
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
      starters: thisBooking.starters,
    };


    /* Specify options for posting order to API */
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservation),
    };
    /* Post booking to server */
    fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (parsedResponse) {
        console.log('parsedResponse: ', parsedResponse);
        thisBooking.reservedTable = undefined;
        thisBooking.getData();
      });

    return alert('Selected table has been successfully booked!');
  }

  /* method that removes Reserved class from selected table after making a booking */
  refreshTable() {
    const thisBooking = this;

    const tables = thisBooking.dom.tables;

    for (let table of tables) {
      table.classList.remove(classNames.booking.tableReserved);
    }
  }

  initActions() {
    const thisBooking = this;
    /* Actions to be executed after clicking submit button */
    thisBooking.dom.bookingForm.addEventListener('submit', function (event) {
      event.preventDefault();
      /*set reservedTable null property to prevent book a table after deselect*/
      thisBooking.reservedTable = null;
      if (!thisBooking.reservedTable) {
        return alert('Please choose a table');
      } else if (!thisBooking.dom.phone.value) {
        return alert('Please enter your phone number');
      } else if (!thisBooking.dom.address.value) {
        return alert('Please enter your address');
      }
      /* Send booking to API */
      thisBooking.sendBooking();
      /* Refresh tables */
      thisBooking.refreshTable();
      /* reset booking form */
      thisBooking.dom.bookingForm.reset();
    });
  }

  renderOnSite(element) {
    const thisBooking = this;
    /* generate HTML code using booking Widget template */
    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    /* make const for container of booking section from app.js */
    thisBooking.dom.wrapper = element;
    /* insert booking HTML generated from the template into booking wrapper */
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    /* save people-amount element found in wrapper */
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    /* save booking duration element found in wrapper */
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    /* save booking date element found in wrapper */
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    /* save booking hour element found in wrapper */
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    /* save all table elements found in wrapper */
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    /* save booking form element found in wrapper */
    thisBooking.dom.bookingForm = thisBooking.dom.wrapper.querySelector(select.booking.bookingForm);
    /* save phone input element found in wrapper */
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    /* save address input element found in wrapper */
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    /* save starters checkbox element found in wrapper */
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
  }
  initWidgets() {
    const thisBooking = this;

    /* Initialize widget changing amount of people */
    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    /* Initialize widget changing number of hours */
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    /* Initialize widget selecting date */
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    /* Initialize widget selecting hour */
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
    /* Update DOM after user update input data */
    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });
  }

}

export default Booking;
