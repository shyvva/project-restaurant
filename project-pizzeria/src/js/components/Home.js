import { templates, select, settings } from '../settings.js';
import utils from '../utils.js';
class Home {
  constructor() {
    const thisHome = this;

    thisHome.render();
    thisHome.getData();
    thisHome.initSlider();
  }

  render() {
    const thisHome = this;

    /* generate HTML based on template */
    const generatedHTML = templates.home();
    console.log(generatedHTML);
    /* create element using utils.createElementFromHTML */
    thisHome.element = utils.createDOMFromHTML(generatedHTML);

    /* find home page container */
    const homeContainer = document.querySelector(select.containerOf.home);

    /* add element to home page */
    homeContainer.appendChild(thisHome.element);
  }

  getData() {
    const thisHome = this;

    thisHome.data = {};

    const url = settings.db.url + '/' + settings.db.gallery;

    fetch(url)
      .then(function (rawResponse) {
        return rawResponse.json();
      })
      .then(function (parsedResponse) {
        console.log('parsedResponse', parsedResponse);
        thisHome.data.images = parsedResponse;

        thisHome.renderGallery();
      });
    //console.log('thisHome.data', thisHome.data);
  }

  renderGallery() {
    const thisHome = this;

    const makeObject = Object.assign({}, thisHome.data.images);
    //console.log('makeObject', makeObject);

    const allImages = { image: makeObject };
    //console.log('allImages', allImages);

    const generatedHTML = templates.gallery(allImages);
    //console.log(generatedHTML);

    thisHome.element = utils.createDOMFromHTML(generatedHTML);

    const imageContainer = document.querySelector(select.containerOf.gallery);

    imageContainer.appendChild(thisHome.element);

  }

  initSlider() {
    this.elem = document.querySelector('.main-carousel');
    this.flickity = new Flickity(this.elem, { // eslint-disable-line
      // options
      cellAlign: 'center',
      autoPlay: true,
      wrapAround: true,
      prevNextButtons: false
    });
  }
}

export default Home;
