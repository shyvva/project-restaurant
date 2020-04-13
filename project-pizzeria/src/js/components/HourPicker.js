
import BaseWidget from './BaseWidget.js';
import { settings, select } from '../settings.js';
import utils from '../utils.js';

class HourPicker extends BaseWidget {
  constructor(wrapper) {
    super(wrapper, settings.hours.open);

    const thisHourPickerWidget = this;

    thisHourPickerWidget.dom = {};
    thisHourPickerWidget.dom.wrapper = wrapper;

    thisHourPickerWidget.dom.input = thisHourPickerWidget.dom.wrapper.querySelector(select.widgets.hourPicker.input);
    thisHourPickerWidget.dom.output = thisHourPickerWidget.dom.wrapper.querySelector(select.widgets.hourPicker.output);

    thisHourPickerWidget.initPlugin();

    thisHourPickerWidget.value = thisHourPickerWidget.dom.input.value;
  }

  initPlugin() {
    const thisHourPickerWidget = this;

    rangeSlider.create(thisHourPickerWidget.dom.input);

    thisHourPickerWidget.dom.input.addEventListener('input', function () {
      thisHourPickerWidget.value = thisHourPickerWidget.dom.input.value;
    });

  }

  parseValue(value) {
    return utils.numberToHour(value);
  }

  isValid() {
    return true;
  }

  renderValue() {
    const thisHourPickerWidgetWidget = this;
    thisHourPickerWidgetWidget.dom.output.innerHTML = thisHourPickerWidgetWidget.value;
  }
}

export default HourPicker;
