const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const fs = require("fs"); // Подключение встроенного в Node.js модуля fs для работы с файловой системой
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

const pagesNumber = 2; //53; // Количество страниц со статьями на сайте журнала на текущий день. На каждой странице до 18 статей
const baseLink =
  "https://transistor.ru/catalog/magnitnaya-sistema-mag-327/?PAGEN_1="; // Типовая ссылка на страницу со статьями (без номера в конце)
const endLink = "&SIZEN_1=10";
let page = 1; // Номер первой страницы для старта перехода по страницам с помощью пагинатора
let parsingTimeout = 0; // Стартовое значение задержки следующего запроса (увеличивается с каждым запросом, чтобы не отправлять их слишком часто)

let articul = "026956";




const attributesGenerator = (num, name, value) => {
  const nameKey = "Название атрибута " + num;
  const valueKey = "Значения атрибутов " + num;
  const visibilityKey = "Видимость атрибута " + num;
  const globalKey = "Глобальный атрибут " + num;
  return {
    [nameKey]: name,
    [valueKey]: value,
    [visibilityKey]: 1,
    [globalKey]: 1,
  };
};

const itemsObjectGenerator = (artucul, name, shortDescription, description, price, ...attributes) => {
  const obj = attributes.reduce((acc, value) => {
    return { ...acc, ...value };
  });
  return {
    Тип: "simple",
    Артикул: artucul,
    Имя: name,
    Опубликован: 1,
    "Видимость в каталоге": "visible",
    'Краткое описание': shortDescription,
    Описание: description,
    "Базовая цена": price,
    ...obj,
  };
};


/* выполнняет поиск по рядам таблицы */
function findAttributes(productProperties, attributeName){
  let propertiesLength = productProperties.length
    for (i = 0; i < propertiesLength; i++) {
        let condition = productProperties[i].getElementsByClassName('product__properties-td')[0].innerHTML 
        if (condition == attributeName) {
            return productProperties[i].getElementsByClassName('product__properties-td')[1].innerHTML
        }
    }
}
function paginator() {
  function getArticles() {
    var link = baseLink + page + endLink; // Конструктор ссылки на страницу со статьями для запроса по ней
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    axios.get(link).then((response) => {
      var currentPage = response.data; // Запись полученного результата
      const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
      // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
      var linksLength = 10;
      // Перебор и запись всех статей на выбранной странице
      for (i = 0; i < linksLength; i++) {
        // Получение относительных ссылок на статьи (так в оригинале)
        let articulOnPage = dom.window.document.getElementsByClassName("catalog-section")[0].getElementsByClassName("card-item")[i].getElementsByClassName("card")[0].getElementsByClassName("card__content")[0].getElementsByClassName("card__article")[0].getElementsByTagName("a")[0].innerHTML;
        if (articul == articulOnPage) {
          var relLink = dom.window.document.getElementsByClassName("catalog-section")[0].getElementsByClassName("card-item")[i].getElementsByClassName("card")[0].getElementsByClassName("card__img")[0].getElementsByTagName("a")[0].getAttribute("href");
          // Превращение ссылок в абсолютные
          var itemLink = relLink.replace("/", "https://transistor.ru/");
          // Уведомление о найденных статьях
          console.log("Для артикула" +articul +"на странице " +"найден товар" +itemLink);

          axios.get(itemLink).then((response) => {
            /* пути */
            var itemPage = response.data; // Запись полученного результата
            const dom = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
            const document = dom.window.document;
            const productContent = document.getElementsByClassName('product__content')[0]
            const productProperties = productContent.getElementsByClassName('product__properties')[0]
            /* Общая информация */
            const name = document.getElementsByTagName('h1')[0].innerHTML
            const shortDescription = productContent.getElementsByClassName('product__description')[0].innerHTML
            const description = document.getElementsByClassName('product__application-block')[0].getElementsByClassName('product__application-block--text')[0].innerHTML
            const price = productContent.getElementsByClassName('product__buy')[0].getElementsByClassName('product__price')[0].getAttribute("content")

            /* Общие атрибуты */
            const productPropertiesMain = productProperties.getElementsByClassName('product__properties-table')[0].getElementsByClassName('product__properties-row')
            const productPropertiesSpecial = productProperties.getElementsByClassName('product__properties-table')[3].getElementsByClassName('product__properties-row')
            const productPropertiesSizes = productProperties.getElementsByClassName('product__properties-table')[4].getElementsByClassName('product__properties-row')

            let type = attributesGenerator(1, 'Тип товара', findAttributes(productPropertiesMain, 'Тип товара'))
                model = attributesGenerator(2, 'Модельный ряд', findAttributes(productPropertiesMain, 'Модельный ряд'))
                warranty = attributesGenerator(3, 'Гарантийный срок', findAttributes(productPropertiesMain, 'Гарантийный срок'))
                color = attributesGenerator(4, 'Цвет', findAttributes(productPropertiesSpecial, 'Цвет'))
                height = attributesGenerator(5, 'Высота', findAttributes(productPropertiesSizes, 'Высота'))
                width = attributesGenerator(6, 'Ширина', findAttributes(productPropertiesSizes, 'Ширина'))
                length = attributesGenerator(7, 'Длина', findAttributes(productPropertiesSizes, 'Длина'))
            
/*             console.log('name', name)
            console.log('shortDescription', shortDescription)
            console.log('description', description)
            console.log('price', price)
            console.log('type', type)
            console.log('model', model)
            console.log('warranty', warranty)
            console.log('color', color)
            console.log('height', height)
            console.log('width', width)
            console.log('length', length) */
            let itemData = itemsObjectGenerator(articul, name, shortDescription, description, price, type, model, warranty, color, height, width, length)
            // Запись результата в файл
            fs.appendFileSync("./output.txt", JSON.stringify(itemData)+'\n', (err) => {
              if (err) throw err;
            });
          });
        }
      }
      if (page > pagesNumber) {
        console.log("Парсинг завершён.");
      } // Уведомление об окончании работы парсера
    });
    page++; // Увеличение номера страницы для сбора данных, чтобы следующий запрос был на более старую страницу
  }
  for (var i = page; i <= pagesNumber; i++) {
    var getTimer = setTimeout(getArticles, parsingTimeout); // Запуск сбора статей на конкретной странице с задержкой
    parsingTimeout += 10000; // Определение времени, через которое начнётся повторный запрос (к следующей по счёту странице)
  }
  return; // Завершение работы функции
}
paginator(); // Запуск перехода по страницам и сбора статей
