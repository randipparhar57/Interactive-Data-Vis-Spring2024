let index=0;
const counterDisplay = document.getElementById('display');

function countIncrease(){
    index ++;
    counterDisplay.innerHTML = index;
}

function countDecrease(){
    index --;
    counterDisplay.innerHTML = index;
}

function countReset(){
    index=0;
    counterDisplay.innerHTML = index;
}