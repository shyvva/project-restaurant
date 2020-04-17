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

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

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

    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat.join('&'),

    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ]).then(function (allResponses) {
      const bookingsResponse = allResponses[0];
      const eventsCurrentResponse = allResponses[1];
      const eventsRepeatResponse = allResponses[2];

      return Promise.all([
        bookingsResponse.json(),
        eventsCurrentResponse.json(),
        eventsRepeatResponse.json(),
      ]);

    }).then(function ([bookings, eventsCurrent, eventsRepeat]) {
      thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
    });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);


    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;


    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ) {
      allAvailable = true;
    }


    for (let table of thisBooking.dom.tables) {

      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {

        table.classList.add(classNames.booking.tableBooked);
      } else {

        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  makeReserved() {
    const thisBooking = this;

    const tables = thisBooking.dom.tables;

    for (let table of tables) {
      table.addEventListener('click', function (event) {
        event.preventDefault();
        if (!table.classList.contains(classNames.booking.tableBooked)) {
          /* Add class reserved - not booked, has different color */
          table.classList.toggle(classNames.booking.tableReserved);

          thisBooking.reservedTable = parseInt(table.getAttribute(settings.booking.tableIdAttribute));

        } else {
          return alert('This table is not available');
        }

        const allReservedTables = document.querySelectorAll(select.booking.tablesReserved);

        for (let reservedTable of allReservedTables) {

          if (reservedTable !== table) {
            reservedTable.classList.remove(classNames.booking.tableReserved);
          }
        }
      });

      thisBooking.dom.datePicker.addEventListener('updated', function () {
        table.classList.remove(classNames.booking.tableReserved);
      });

      thisBooking.dom.hourPicker.addEventListener('updated', function () {
        table.classList.remove(classNames.booking.tableReserved);
      });
    }

    thisBooking.starters = [];

    const starters = thisBooking.dom.starters;

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


  sendBooking() {
    const thisBooking = this;


    const url = settings.db.url + '/' + settings.db.booking;

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


    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservation),
    };

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


  refreshTable() {
    const thisBooking = this;

    const tables = thisBooking.dom.tables;

    for (let table of tables) {
      table.classList.remove(classNames.booking.tableReserved);
    }
  }

  initActions() {
    const thisBooking = this;
    thisBooking.dom.bookingForm.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!thisBooking.reservedTable) {
        return alert('Please choose a table');
      } else if (!thisBooking.dom.phone.value) {
        return alert('Please enter your phone number');
      } else if (!thisBooking.dom.address.value) {
        return alert('Please enter your address');
      }

      thisBooking.sendBooking();
      thisBooking.refreshTable();
      thisBooking.dom.bookingForm.reset();
    });
  }

  renderOnSite(element) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.bookingForm = thisBooking.dom.wrapper.querySelector(select.booking.bookingForm);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
  }
  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });
  }

}

export default Booking;
