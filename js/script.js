// OMDB API-avain
const omdbApiKey = '6c2c6b48';

// Taustakuvien vaihto jQueryn avulla
const taustakuvat = ['images/grungetausta2.jpg', 'images/retrotausta2.gif'];
let nykyinenTaustakuva = 0;

function vaihdaTaustakuva() {
    nykyinenTaustakuva = (nykyinenTaustakuva + 1) % taustakuvat.length;
    $('body').css('backgroundImage', `url('${taustakuvat[nykyinenTaustakuva]}')`);
}

// Funktio äänenvoimakkuuden säätämiseen jQueryn avulla
function setVolume(value) {
    $("#background-music").prop('volume', value);
}

// Äänenvoimakkuuden säätimen alustaminen jQueryn avulla
$(function() {
    const volumeSlider = $("#volume-slider");
    
    // Piilota säätimen konteineri alussa jQueryn avulla
    const volumeSliderContainer = $("#volume-slider-container");
    volumeSliderContainer.hide();

    // Määritellään säätimen ominaisuudet
    volumeSlider.prop({ min: "0", max: "1", step: "0.01", value: "0.5" });

    // Kun säätimen arvoa muutetaan ensimmäisen kerran, näytetään se slideDown-efektillä
    volumeSlider.one('input', function() {
        volumeSliderContainer.slideDown('slow');
    });

    // Määritellään säätimen arvon muuttumisen tapahtumankäsittelijä
    volumeSlider.on('input', function() {
        setVolume(this.value);
    });
});

// Live-kellon päivitys jQueryn avulla
const updateClock = () => {
    const now = new Date();
    let hours = now.getUTCHours() + 2; // Suomen aika UTC+2 (Riippuen vuodenajasta)
    let minutes = now.getUTCMinutes();
    let seconds = now.getUTCSeconds();

    // Lisätään johtava nolla tunneille, minuuteille ja sekunneille, jos ne ovat alle 10
    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    seconds = seconds < 10 ? `0${seconds}` : seconds;

    const timeString = `${hours}:${minutes}:${seconds}`;
    $('#live-clock').text(timeString);
};

setInterval(updateClock, 1000); // Laskee jokaisen sekunnin

// Teatterivalikon populointi jQueryn avulla
function populateTheaters() {
    $.ajax({
        url: 'https://www.finnkino.fi/xml/TheatreAreas/',
        method: 'GET',
        dataType: 'xml',
        success: function(data) {
            const theaters = $(data).find('TheatreArea').toArray();
            theaters.sort((a, b) => $(a).find('Name').text().localeCompare($(b).find('Name').text()));

            const dropdown = $('#theater-dropdown');
            dropdown.empty().append('<option>Valitse teatteri</option>');
            theaters.forEach(theater => {
                dropdown.append($('<option>', {
                    value: $(theater).find('ID').text(),
                    text: $(theater).find('Name').text()
                }));
            });
        },
        error: function() {
            $('#theater-dropdown').html('<option>Teattereiden lataus epäonnistui</option>');
        }
    });
}

// Funktio elokuvien hakemiseen ja näyttämiseen jQueryn avulla
function fetchMovies(theaterId) {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const url = `https://www.finnkino.fi/xml/Schedule/?area=${theaterId}&dt=${formattedDate}`;

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'xml',
        success: function(data) {
            const shows = $(data).find('Show');
            const moviesContainer = $('#movies-container').empty();

            shows.each(function() {
                const title = $(this).find('Title').text();
                const originalTitle = $(this).find('OriginalTitle').text();
                const showTime = $(this).find('dttmShowStart').text();
                fetchMovieInfo(originalTitle, moviesContainer, showTime);
            });
        },
        error: function() {
            console.error('Virhe haettaessa elokuvia');
        }
    });
}

// Funktio elokuvatiedon hakemiseen OMDB:stä jQueryn avulla
function fetchMovieInfo(title, container, showTime) {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&language=fi&apikey=${omdbApiKey}`;

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
        success: function(movieInfo) {
            if (movieInfo.Response === "True") {
                displayMovieInfo(movieInfo, container, showTime);
            }
        },
        error: function() {
            console.error('Virhe haettaessa elokuvan tietoja');
        }
    });
}

// Funktio elokuvan tietojen näyttämiseen
function displayMovieInfo(movieInfo, container, showTime) {
    const showTimeFormatted = new Date(showTime).toLocaleString('fi-FI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const movieElement = $('<div>', { class: 'movie' }).html(`
        <img src="${movieInfo.Poster}" alt="${movieInfo.Title} juliste">
        <h3>${movieInfo.Title}</h3>
        <p>Näytösaika: ${showTimeFormatted}</p>
        <p>Genre: ${movieInfo.Genre}</p>
        <p>Ohjaaja: ${movieInfo.Director}</p>
        <p>Näyttelijät: ${movieInfo.Actors}</p>
        <p>Kesto: ${movieInfo.Runtime}</p>
        <p>Ikäraja: ${movieInfo.Rated}</p>
        <details>
            <summary>Juoni (Lue klikkaamalla)</summary>
            <p>${movieInfo.Plot}</p>
        </details>
        <button class='add-to-wishlist-button' data-added='false'>Lisää toivelistaan</button>
    `);

    // SlideDown animaatio
    movieElement.find('details').on('toggle', function() {
        if (this.open) {
            $(this).hide().slideDown(1000);
        }
    });

    // Rekisteröi tapahtumankäsittelijä toivelistan painikkeelle
    movieElement.find('.add-to-wishlist-button').on('click', handleWishlistButtonClick);

    // Lisää elokuvaelementti containeriin
    container.append(movieElement);
}

// Toivelistan painikkeiden yhteinen tapahtumankäsittelijä
function handleWishlistButtonClick() {
    const button = $(this);
    const isAdded = button.data('added');

    if (isAdded) {
        button.data('added', false).removeClass('added-to-wishlist');
        alert('Poistettu toivelistalta');
    } else {
        button.data('added', true).addClass('added-to-wishlist');
        alert('Lisätty toivelistalle');
    }
}

// Funktio elokuvien suodattamiseen
function filterMovies() {
    const searchValue = $('#search-input').val().toLowerCase();
    $('.movie').each(function() {
        const title = $(this).find('h3').text().toLowerCase();
        $(this).toggle(title.includes(searchValue));
    });
}

// Alusta teatterivalikko ja kuuntelijat jQueryn avulla
$(function() {
    populateTheaters();
    $('#theater-dropdown').on('change', function() {
        const theaterId = $(this).val();
        if (theaterId) {
            fetchMovies(theaterId);
        }
    });
    $('#search-input').on('input', filterMovies);
});

// Funktio musiikin toiston hallintaan
function toggleMusic() {
    var music = $("#background-music")[0];
    var musicButton = $("#music-toggle-button");
    var volumeSliderContainer = $("#volume-slider-container");

    if (music.paused) {
        music.play();
        musicButton.text("Musiikki Off");
        volumeSliderContainer.slideDown();
    } else {
        music.pause();
        musicButton.text("Musiikki On");
        volumeSliderContainer.slideUp();
    }
}

$(document).ready(function() {
    // Lisätään aktiiviset luokat heti, kun dokumentti on valmis
    $('#theater-dropdown, #search-input').addClass('active');
});