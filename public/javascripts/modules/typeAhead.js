import axios from 'axios';
import dompurify from 'dompurify';

const KEYS = {
  DOWN: 40,
  UP: 38,
  ENTER: 13
};
function typeahead(search) {
  if (!search) {
    return;
  }

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    // If there is no value, quit it
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    searchResults.style.display = 'block';
    searchResults.innerHTML = '';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(
            searchResultsHTML(res.data)
          );
        } else {
          searchResults.innerHTML = dompurify.sanitize(
            `<div className="search__result">No results for  ${this.value} found!</div>`
          );
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
  searchInput.on('keyup', e => {
    const { keyCode } = e;
    // If not pressing up, down or enter. Skip it
    if (![38, 40, 13].includes(keyCode)) {
      return;
    }
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    if (!items || items.length) {
      return;
    }
    if (keyCode === KEYS.DOWN && current) {
      next = current.nextElementSibling || items[0];
    } else if (keyCode === KEYS.DOWN) {
      next = items[0];
    } else if (keyCode === KEYS.UP && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (keyCode === KEYS.UP) {
      next = items[items.length - 1];
    } else if (keyCode === KEYS.ENTER && current) {
      window.location = current.href;
      return;
    }
    if (current) {
      current.classList.remove(activeClass);
    }

    next.classList.add(activeClass);
  });
}

function searchResultsHTML(stores) {
  return stores
    .map(store => {
      return `
    <a href="/stores/${store.slug}"  class="search__result">
    <strong>${store.name}</strong>
    </a>
    `;
    })
    .join(' ');
}

export default typeahead;
