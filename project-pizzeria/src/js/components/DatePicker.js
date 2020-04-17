/*global flatpickr*/
import { select, settings } from '../settings.js';
import utils from '../utils.js';
import BaseWidget from './BaseWidget.js';

class DatePicker extends BaseWidget {
  constructor(wrapper) {
    super(wrapper, utils.dateToStr(new Date()));

    const thisDatePicker = this;

    thisDatePicker.dom = {};
    thisDatePicker.dom.wrapper = wrapper;

    thisDatePicker.dom.input = thisDatePicker.dom.wrapper.querySelector(select.widgets.datePicker.input);

    thisDatePicker.initPlugin();
  }

  initPlugin() {
    const thisDatePicker = this;

    thisDatePicker.minDate = new Date(thisDatePicker.value);
    thisDatePicker.maxDate = new Date(utils.addDays(thisDatePicker.minDate, settings.datePicker.maxDaysInFuture));


    flatpickr(thisDatePicker.dom.input, {
      defaultDate: thisDatePicker.minDate,
      minDate: thisDatePicker.minDate,
      maxDate: thisDatePicker.maxDate,
      locale: {
        firstDayOfWeek: 1
      },
      disable: [
        function (date) {
          return (date.getDay() === 1);
        }
      ],
      onChange: function (dates ,dateToStr) {
        thisDatePicker.value = dateToStr;
      },
    });
  }

  parseValue(value) {
    return (value);
  }

  isValid(value) {
    return(value);
  }

  renderValue() {
    const thisWidget = this;

    thisWidget.dom.input.value = thisWidget.value;
  }
}

export default DatePicker;
