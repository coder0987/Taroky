function learnStarter() {
    document.getElementById('selection').classList.remove('fadeIn');
    document.getElementById('selection').classList.add('fadeOut');

    setTimeout(() => {
        document.getElementById('selection').setAttribute('hidden','hidden');
        document.getElementById('starter').classList.add('fadeIn');
        document.getElementById('starter').classList.remove('fadeOut');
        document.getElementById('starter').removeAttribute('hidden');
    }, 500);
}
function learnAdvanced() {
    document.getElementById('selection').classList.remove('fadeIn');
    document.getElementById('selection').classList.add('fadeOut');

    setTimeout(() => {
        document.getElementById('selection').setAttribute('hidden','hidden');
        document.getElementById('advanced').classList.add('fadeIn');
        document.getElementById('advanced').classList.remove('fadeOut');
        document.getElementById('advanced').removeAttribute('hidden');
    }, 500);

}
function learnSite() {
    document.getElementById('selection').classList.remove('fadeIn');
    document.getElementById('selection').classList.add('fadeOut');

    setTimeout(() => {
        document.getElementById('selection').setAttribute('hidden','hidden');
        document.getElementById('site').classList.add('fadeIn');
        document.getElementById('site').classList.remove('fadeOut');
        document.getElementById('site').removeAttribute('hidden');
    }, 500);
}

function back() {
    document.getElementById('starter').classList.add('fadeOut');
    document.getElementById('starter').classList.remove('fadeIn');
    document.getElementById('site').classList.add('fadeOut');
    document.getElementById('site').classList.remove('fadeIn');
    document.getElementById('advanced').classList.add('fadeOut');
    document.getElementById('advanced').classList.remove('fadeIn');

    document.getElementById('starter1').classList.add('fadeIn');
    document.getElementById('starter1').classList.remove('fadeOut');


    setTimeout(() => {
        for (let i=2; i<16; i++) {
            document.getElementById('starter' + i).setAttribute('hidden','hidden');
            document.getElementById('starter' + i).classList.remove('fadeOut');
            document.getElementById('starter' + i).classList.add('fadeIn');
        }
        document.getElementById('starter').setAttribute('hidden','hidden');
        document.getElementById('site').setAttribute('hidden','hidden');
        document.getElementById('advanced').setAttribute('hidden','hidden');
        document.getElementById('starter1').removeAttribute('hidden');

        document.getElementById('selection').classList.remove('fadeOut');
        document.getElementById('selection').classList.add('fadeIn');
        document.getElementById('selection').removeAttribute('hidden');
    }, 500);
}

function pageOver(pageNumber) {
    document.getElementById('starter' + pageNumber).classList.add('fadeOut');
    document.getElementById('starter' + pageNumber).classList.remove('fadeIn');

    setTimeout(() => {
        document.getElementById('starter' + pageNumber).setAttribute('hidden','hidden');

        document.getElementById('starter' + (pageNumber + 1)).classList.add('fadeIn');
        document.getElementById('starter' + (pageNumber + 1)).classList.remove('fadeOut');
        document.getElementById('starter' + (pageNumber + 1)).removeAttribute('hidden');
    }, 500);
}

function pageBack(pageNumber) {
    document.getElementById('starter' + pageNumber).classList.add('fadeOut');
    document.getElementById('starter' + pageNumber).classList.remove('fadeIn');

    setTimeout(() => {
        document.getElementById('starter' + pageNumber).setAttribute('hidden','hidden');

        document.getElementById('starter' + (pageNumber - 1)).classList.add('fadeIn');
        document.getElementById('starter' + (pageNumber - 1)).classList.remove('fadeOut');
        document.getElementById('starter' + (pageNumber - 1)).removeAttribute('hidden');
    }, 500);
}