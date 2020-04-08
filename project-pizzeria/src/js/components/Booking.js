import { templates, select} from '../settings.js';
import AmountWidget from './AmountWidget.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.renderOnSite(element);
    thisBooking.initWidgets();
  }

  renderOnSite(render) {
    const thisBooking = this;

    const generateHTML = templates.bookingWidget();

    thisBooking.dom = {};

    thisBooking.dom.wrapper = render;

    thisBooking.dom.wrapper.innerHTML = generateHTML;

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmnount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmnount = new AmountWidget(thisBooking.dom.hoursAmnount);

  }

}

export default Booking;
