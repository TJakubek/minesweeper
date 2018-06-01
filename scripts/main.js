$(function(){

  const settingButtons = $('.settings-button');
  const customInputs = $('.custom-options-box__option__input');
  const informationBox = $('#informationBox');
  const generateButton = $('#game-generate-button');
  const standardSettings = {
    easy: {
      rowCount: 9,
      columnCount: 9,
      mineCount: 10
    },
    medium: {
      rowCount: 16,
      columnCount: 16,
      mineCount: 40
    },
    hard: {
      rowCount: 16,
      columnCount: 30,
      mineCount: 99
    },
    custom: {
      rowCount: 0,
      columnCount: 0,
      mineCount: 0
    }
  };
  const gameBox = $('#game-box');
  const timeCounter = $('#timeCounter');
  const minesLeftCounter = $('#minesLeftCounter');
  let surroundingsToTemporarilyShow = [];
  let temporarilyHighlighted = [];
  let mineBoxes;
  let spiralTimeoutArray = [];
  const surroundingTilesArray = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
  const messages = {
    easy: `This will generate ${standardSettings.easy.rowCount} rows, ${standardSettings.easy.columnCount} columns and ${standardSettings.easy.mineCount} mines.`,
    medium: `This will generate ${standardSettings.medium.rowCount} rows, ${standardSettings.medium.columnCount} columns and ${standardSettings.medium.mineCount} mines.`,
    hard: `This will generate ${standardSettings.hard.rowCount} rows, ${standardSettings.hard.columnCount} columns and ${standardSettings.hard.mineCount} mines.`,
    custom: {
      errorText: '<p class="error-message"> Only numbers can be accepted, let me help you! </p>',
      errorActive: false
    }
  };
  let memoryTable = [];
  const mouseEvents = [false, false];
  const gameStatus ={
    gameIsPlayable: false,
    minesTotal: 0,
    minesLeft: 0,
    tilesLeft: 0,
    wrongMinesFlagged: 0,
    time: 0,
    started: false,
    timeStart: false,
  };
  const minPeriLoader = $('.min-peri-loader');

  settingButtons.on('click', function(){
    for(let button of settingButtons){
      button.classList.remove('active-button');
    }
    this.classList.add('active-button');
    manageCustomInputs();
    updateInformationBox();
  });

  customInputs.on('blur', function() {
    updateCustomSettings(this);
  });

  generateButton.on('click', function(){
    clearInterval(gameStatus.timeStart);
    gameStatus.time = 0;
    gameStatus.started = false;
    gameStatus.timeStart = false;

    clearSpiralAnimation();
    attemptGameGeneration();
  });

  //UI
  function updateInformationBox() {
    const activeId = findActiveButton();
    if (activeId !== 'custom') {
      informationBox[0].textContent = messages[activeId];
    } else {
      manageCustomText('initiation');
    }
  }

  function findActiveButton(){
    for (const button of settingButtons){
      if($(button).hasClass('active-button')){
        return $(button).attr('id');
      }
    }
  }

  function activateCustomInputs(){
    for(const input of customInputs){
      input.disabled = false;
    }
  }

  function deactivateCustomInputs(){
    for(const input of customInputs){
      input.disabled = true;
    }
  }

  function manageCustomInputs(){
    const activeId = findActiveButton();
    for(const input of customInputs){
      $(input).val(standardSettings[activeId][$(input).attr('id')])
    }
    deactivateCustomInputs();
    if(activeId === 'custom'){
      activateCustomInputs();
    }
  }

  function manageCustomText(textType, array){
    const messageArray = [];
    let finalText;


    switch (textType) {
      case 'initiation':
        if(messages.custom.errorActive === true){
          messageArray.push(messages.custom.errorText);
        }
        for (const input of customInputs){
          if($(input).val() === '0'){
            messageArray.push(`<p>Please enter number of ${$(input).attr('name')}.</p>`);

          } else {
            messageArray.push(`<p>This will generate ${$(input).val()} ${$(input).attr('name')}. </p>`);
          }
        }
        break;
      case 'win':
        messageArray.push('<h3>Congratulations! You won!</h3>');
        messageArray.push('<p>Select a new difficulty and regenerate the map to play again.</p>');
        messageArray.push('<p>You can also press "r" on your keyboard for quick regeneration</p>');
        break;
      case 'algoFail':
        messageArray.push('<h3>Oops!</h3>');
        messageArray.push('<h4>The algorithm has no certain candidate.</h4>');
        messageArray.push('<p>Please choose a tile according to your knowledge of probabilities.</p>');
        messageArray.push('<p>If correctly guessed you can try to use the algorithm again!</p>');
        break;
      case 'lose':
        messageArray.push('<h3>Oops! You lost!</h3>');
        messageArray.push(`<p>You found ${gameStatus.minesTotal - gameStatus.minesLeft - gameStatus.wrongMinesFlagged} mines and uncovered ${Math.floor((((memoryTable.length * memoryTable[0].length) - (gameStatus.tilesLeft + gameStatus.minesTotal)) / (memoryTable.length * memoryTable[0].length))*100)}% of the map.</p>`);
        if(gameStatus.wrongMinesFlagged !== 0){
          messageArray.push(`<h4>Be careful next time! You flagged ${gameStatus.wrongMinesFlagged} tiles wrongly!</h4>`);
        }
        messageArray.push('<p>Select a new difficulty and regenerate the map to play again.</p>');
        messageArray.push('<p>You can also press "r" on your keyboard for quick regeneration</p>');

        break;
      case 'custom':
        for(const texts of array){
          if(texts === 'row'){
            messageArray.push('<p>Please enter an appropriate number of rows (between 9 and 24).</p>');
          } else if(texts === 'column'){
            messageArray.push('<p>Please enter an appropriate number of columns (between 9 and 30).</p>');
          } else {
            messageArray.push('<p>Please enter an appropriate number of mines (between 10 and 668).</p>');
          }
        }
        break;
      case 'numberError':
        messageArray.push('<h3>Please only enter numbers.</h3>');
        break;
      default:
        messageArray.push('<h2>Good luck!</h2>');
    }
    finalText = messageArray.join('');
    informationBox[0].innerHTML = finalText;
  }

  function updateCustomSettings(that){
    if($(that).val().match(/[^0-9]/)){
      messages.custom.errorActive = true;
      manageCustomText('numberError')
    }
    standardSettings.custom[$(that).attr('id')] = $(that).val().match(/\d*/)[0] || 0;
    manageCustomInputs();
  }

  function updateMinesLeftStatus(value){
    gameStatus.minesLeft += value;
    minesLeftCounter.val(gameStatus.minesLeft);
  }

  function updateTimer(){
    timeCounter.val(gameStatus.time);
  }

//game generation

  function attemptGameGeneration(){
    const values = interpretCustomInputs()[0];
    const generatable = interpretCustomInputs()[2];
    const errorMessage = interpretCustomInputs()[1];
    if(generatable === true) {
      generateGame(values);
    } else{
      manageCustomText('custom', errorMessage);
    }
  }

  function generateGame(valuesArray){
    updateGamestatusObject(valuesArray);
    updateMinesLeftStatus(0);
    updateTimer();
    generateGrid(...valuesArray);
    createMemoryTable(...valuesArray);
    randomizeHue();
    appearGame();
    randomizeMines(...valuesArray);
    generateTileNumbers(...valuesArray);
    mineBoxes = $('.mine-box');
    addEventsToMineboxes();
    manageCustomText();
  }

  function interpretCustomInputs(){
    const values = [];
    let errorMessage = [];
    let generatable = true;
    for(const input of customInputs){

      switch ($(input).attr('id')) {
        case 'rowCount':
          if($(input).val() < 9 || $(input).val() > 24){
            generatable = false;
            errorMessage.push('row');
          }
          break;
        case 'columnCount':
          if($(input).val() < 9 || $(input).val() > 30){
            generatable = false;
            errorMessage.push('column');
          }
          break;
        case 'mineCount':
          if($(input).val() < 10 || $(input).val() > 668){
            generatable = false;
            errorMessage.push('mine');
          }
          break;
        default:
      }
      values.push(Number($(input).val()));
    }
    return [values, errorMessage, generatable];
  }

  function updateGamestatusObject(values){
    gameStatus.minesTotal = values[2];
    gameStatus.minesLeft = values[2];
    gameStatus.tilesLeft = values[0] * values[1] - values[2];
    gameStatus.gameIsPlayable = true;
    gameStatus.state = 'inProgress';
    gameStatus.gameIsPlayable = true;
  }

  function addEventsToMineboxes(){
    mineBoxes.on('contextmenu', function(){
      return false;
    });

    mineBoxes.on('mouseover', function (){
      if(mouseEvents[0] === true && mouseEvents[1] === true){
        const row = getTargetFromId(this)[0];
        const column = getTargetFromId(this)[1];
        toggleCover(surroundingsToTemporarilyShow);
        toggleCover(findTilesToTemporarilyShow(row, column));
      }
      if(mouseEvents[0] === true){
        const row = getTargetFromId(this)[0];
        const column = getTargetFromId(this)[1];
        toggleTemporarilyHighlight(temporarilyHighlighted[0], temporarilyHighlighted[1]);
        toggleTemporarilyHighlight(row, column);
      }
    });

    mineBoxes.mousedown(function(event) {
      if(gameStatus.gameIsPlayable === true) {
        const row = getTargetFromId(this)[0];
        const column = getTargetFromId(this)[1];
        switch (event.which) {
          case 1:
            mouseEvents[0] = true;
            if(mouseEvents[1] === true){
              toggleCover(findTilesToTemporarilyShow(row, column));
            }
            toggleTemporarilyHighlight(row, column);
            break;
          case 2:
            break;
          case 3:
            mouseEvents[1] = true;
            if (!checkIfIsVisible(this)) {
              mineBoxRightClick(row, column);
            }
            if(mouseEvents[0] === true){
              toggleCover(findTilesToTemporarilyShow(row, column));
            }
            break;
          default:
        }
      }

      gameBox.on('mouseleave', function(){
        mouseEvents[0] = false;
        mouseEvents[1] = false;
        $('.mine-box__highlighted').each(function(){
          this.classList.remove('mine-box__highlighted')
        })
      })
    });

    mineBoxes.mouseup(function(event) {
      if(gameStatus.gameIsPlayable === true) {
        const row = getTargetFromId(this)[0];
        const column = getTargetFromId(this)[1];
        switch (event.which) {
          case 1:
            if (mineBoxIsNotFlagged(row, column) && mouseEvents[1] !== true) {
              mineBoxLeftClick(row, column);
            }
            if (mouseEvents[1] === true) {
              rightLeftClickedMineBox(row, column);
              toggleCover(surroundingsToTemporarilyShow);
            }
            if(mouseEvents[0] === true) {
              toggleTemporarilyHighlight(row, column);
            }
            mouseEvents[0] = false;
            break;
          case 2:
            rightLeftClickedMineBox(row, column);
            break;
          case 3:
            if (mouseEvents[0] === true) {
              rightLeftClickedMineBox(row, column);
              toggleCover(surroundingsToTemporarilyShow);
            }
            mouseEvents[1] = false;
            break;
          default:
        }
      }
    });
  }

  function createMemoryTable(rows, columns){
    memoryTable = [];
    for(let i = 0; i < rows; i += 1){
      let tempArray = [];
      for (let j = 0; j < columns; j += 1){
        tempArray.push({
          row: i,
          column: j,
          state: 'hidden',
          hasMine: false,
          number: 0,
          checked: false
        });
      }
      memoryTable.push(tempArray);
    }
  }

  function randomizeMines(rowAmount, columnAmount, mineAmount){
    const gridSize = rowAmount * columnAmount;
    for (let i = 0; i < mineAmount; i += 1) {
      generateMinePosition(gridSize, columnAmount);
    }
  }

  function generateMinePosition(gridSize, columnAmount) {
    let randomInt = getRandomInt(0, gridSize -1);
    let targetRow;
    let targetColumn;
    targetRow = Math.floor(randomInt / columnAmount);
    targetColumn = (randomInt % columnAmount);
    if(memoryTable[targetRow][targetColumn].hasMine === true){
      generateMinePosition(gridSize, columnAmount);
    } else {
      memoryTable[targetRow][targetColumn].hasMine = true;
    }
  }

  function generateGrid(rows, columns){
    gameBox.empty();
    for(let i = 0; i < rows; i += 1){
      generateRow(i, columns);
    }
  }

  function generateRow(number, columnAmount){
    const row = document.createElement('div');
    row.classList.add('game-row');
    row.id = `row${number}`;
    for (let i = 0; i < columnAmount; i += 1){
      const divItem =  document.createElement('div');
      divItem.classList.add('mine-box', 'mine-box__hidden', 'mine-box__before-display', 'light-hue');
      divItem.id = `row-${number}_column-${i}`;
      row.append(divItem);
    }
    gameBox.append(row);


  }

  function appearGame(){
    let hiddenTiles = $('.mine-box__before-display');
    if(hiddenTiles.length > 0){
      showHiddenTiles();
      setTimeout(function(){
        appearGame();
      }, (500 / (memoryTable.length * memoryTable[0].length)));
    } else {
      removeHue();
    }
  }

  function showHiddenTiles(){
    let tilesShownAtATime = Math.round(memoryTable.length * memoryTable[0].length / 100);
    for (let i = 0; i < tilesShownAtATime; i += 1) {
      let hiddenTiles = $('.mine-box__before-display');
      if(hiddenTiles.length > 0) {
        let randomInt = getRandomInt(0, hiddenTiles.length - 1);
        hiddenTiles[randomInt].classList.remove('mine-box__before-display');
      }
    }

  }

  function randomizeHue(){
    $('.light-hue').each(function () {
      const hue = get_random_color();
      $(this).css('background-color', hue);
    });
  }

  function get_random_color() {
    const h = getRandomInt(170, 210);
    const s = getRandomInt(80, 100);
    const l = getRandomInt(30, 45);
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
  }

  function removeHue(){
    const removeHue = $('.light-hue');
    removeHue.each(function(){
      this.classList.remove('light-hue');
      this.style.removeProperty('background-color');
    });
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateTileNumbers(rows, columns){
    for (let i = 0; i < rows; i += 1){
      for (let j = 0; j < columns; j += 1){
        let counter = 0;
        if(memoryTable[i][j].hasMine === false){
          for (let k = 0; k < 8; k += 1) {
            if (memoryTable[i + surroundingTilesArray[k][0]] !== undefined && memoryTable[i + surroundingTilesArray[k][0]][j + surroundingTilesArray[k][1]] !== undefined) {
              const surroundingTile = memoryTable[i + surroundingTilesArray[k][0]][j + surroundingTilesArray[k][1]];
              if (surroundingTile.hasMine === true) {
                counter += 1;
              }
            }
          }
        }
        memoryTable[i][j].number = counter;
      }
    }
  }

  function  displayChosenTileProp(row, column){
    const targetTile = mineBoxDomTarget(row, column)[0];
    const isQuestioned = checkIfIsQuestioned(row, column);
    if(isQuestioned){
      mineBoxDomTarget(row, column)[0].classList.remove('questioned');
    }
    if(memoryTable[row][column].hasMine === true){
      targetTile.classList.add('mine');
    } else if (memoryTable[row][column].number === 0){
    } else {
      targetTile.classList.add(`mine_${memoryTable[row][column].number}`);
    }
    if(memoryTable[row][column].state !== 'visible') {
      memoryTable[row][column].state = 'visible';
      if(memoryTable[row][column].hasMine !== true) {
        gameStatus.tilesLeft -= 1;
      }
    }
    targetTile.classList.remove('mine-box__hidden');

    if(gameStatus.started === false && gameStatus.gameIsPlayable === true){
      gameStatus.started = true;
      gameStatus.timeStart =
        setInterval(function(){
          gameStatus.time += 1;
          updateTimer();
        }, 1000);
    }
    if(gameStatus.tilesLeft === 0){
      endGame('win');
      spiralOutwardNew(memoryTable.length / 2, memoryTable[0].length / 2)
    }
  }

  function getTargetFromId(target){
    const row = Number($(target).attr('id').split(/-|_/)[1]);
    const column = Number($(target).attr('id').split(/-|_/)[3]);
    return [row, column];
  }

  // game play

  document.onkeydown = function(e){
    const keyCode = e.code;
    if(keyCode === 'KeyR'){
      endGame('initiation');
      clearSpiralAnimation();
      attemptGameGeneration();
    }
  };

  function mineBoxLeftClick(row, column){
    displayChosenTileProp(row, column);
    const isBomb = checkIfIsBomb(row, column);
    if (isBomb){

      spiralOutwardNew(row, column);
      endGame('lose');
    } else {
      const isZero = checkIfIsZero(row, column);
      if (isZero === true){
        checkForSurroundingZeros(row, column);
      }
    }
  }

  function mineBoxRightClick(row, column){
    switch (memoryTable[row][column].state) {
      case 'hidden':
        memoryTable[row][column].state = 'flagged';
        mineBoxDomTarget(row, column)[0].classList.add('flag');
        updateMinesLeftStatus(-1);
        break;
      case 'flagged':
        memoryTable[row][column].state = 'questioned';
        mineBoxDomTarget(row, column)[0].classList.remove('flag');
        mineBoxDomTarget(row, column)[0].classList.add('questioned');

        updateMinesLeftStatus(1);
        break;
      case 'questioned':
        memoryTable[row][column].state = 'hidden';
        mineBoxDomTarget(row, column)[0].classList.remove('questioned');
        break;
      default:
    }
  }

  function rightLeftClickedMineBox(row, column){
    if(memoryTable[row][column].state === 'visible') {
      const tileValue = memoryTable[row][column].number;
      const surroundingsToShow = checkIfSurroundingMinesFound(row, column, tileValue);
      if(surroundingsToShow !== undefined){
        for( let i = 0; i < surroundingsToShow.length; i += 1){
          const surroundingRow = surroundingsToShow[i][0];
          const surroundingColumn = surroundingsToShow[i][1];
          mineBoxLeftClick(surroundingRow, surroundingColumn);
        }
      }
    }
  }

  function checkIfIsBomb(row, column){
    return memoryTable[row][column].hasMine;
  }

  function checkIfIsQuestioned(row, column){
    return memoryTable[row][column].state === 'questioned';
  }

  function checkIfIsZero(row, column){
    return memoryTable[row][column].number === 0;
  }

  function mineBoxDomTarget(row, column){
    return gameBox.children().eq(row).children().eq(column);
  }

  function endGame(state){
    clearInterval(gameStatus.timeStart);
    gameStatus.time = 0;
    gameStatus.started = false;
    gameStatus.timeStart = false;
    gameStatus.gameIsPlayable = false;
    gameStatus.state = state;
    manageCustomText(state);
    gameStatus.wrongMinesFlagged = 0;
  }

  function checkForSurroundingZeros(row, column){
    for (let k = 0; k < 8; k += 1) {
      if (memoryTable[row + surroundingTilesArray[k][0]] !== undefined && memoryTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]] !== undefined) {
        const surroundingTile = memoryTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]];
        if (surroundingTile.number === 0 && surroundingTile.state === 'hidden' && surroundingTile.state !== 'flagged') {
          displayChosenTileProp(surroundingTile.row, surroundingTile.column);
          checkForSurroundingZeros(surroundingTile.row, surroundingTile.column);
        }
        else if(surroundingTile.state !== 'flagged' && surroundingTile.state === 'hidden'){
          displayChosenTileProp(surroundingTile.row, surroundingTile.column);
        }
      }
    }
  }

  function mineBoxIsNotFlagged(row, column){
    return memoryTable[row][column].state !== 'flagged';
  }

  function findTilesToTemporarilyShow(row, column){
    surroundingsToTemporarilyShow = [];
    for (let k = 0; k < 8; k += 1) {
      if (memoryTable[row + surroundingTilesArray[k][0]] !== undefined && memoryTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]] !== undefined) {
        const surroundingTile = memoryTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]];
        if (surroundingTile.state === 'hidden' || surroundingTile.state === 'questioned') {
          surroundingsToTemporarilyShow.push([row + surroundingTilesArray[k][0], column + surroundingTilesArray[k][1]]);
        }
      }
    }
    return surroundingsToTemporarilyShow;
  }

  function toggleCover(targetArray){
    for (let i = 0; i < targetArray.length; i += 1){
      const targetTile = gameBox.children().eq(targetArray[i][0]).children().eq(targetArray[i][1])[0];
      targetTile.classList.toggle('mine-box__highlighted');
    }
  }

  function toggleTemporarilyHighlight(row, column){
    const targetTile = mineBoxDomTarget(row, column)[0];
    temporarilyHighlighted = [row, column];
    targetTile.classList.toggle('mine-box__highlighted');
  }

  function checkIfSurroundingMinesFound(row, column, tileValue){
    let minesFound = 0;
    const surroundingsToShow = [];
    for (let k = 0; k < 8; k += 1) {
      if (memoryTable[row + surroundingTilesArray[k][0]] !== undefined && memoryTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]] !== undefined) {
        const surroundingTile = memoryTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]];
        if (surroundingTile.state === 'flagged') {
          minesFound += 1;
        } else if (surroundingTile.state !== 'visible'){
          surroundingsToShow.push([row + surroundingTilesArray[k][0], column + surroundingTilesArray[k][1]]);
        }
      }
    }
    if(minesFound === Number(tileValue)){
      return surroundingsToShow;
    }
  }

  function checkIfIsVisible(target){
    const row = getTargetFromId(target)[0];
    const column = getTargetFromId(target)[1];
    return memoryTable[row][column].state === 'visible';
  }

  function spiralOutwardNew(centerRow, centerColumn){
    let tempArray = [];
    const maxX = Math.round(((memoryTable.length - centerRow) > centerRow) ? memoryTable.length - centerRow : centerRow + 1);
    const maxY = Math.round(((memoryTable[0].length - centerColumn) > centerColumn) ? memoryTable[0].length - centerColumn : centerColumn + 1);
    const maxSteps = (maxX > maxY) ? maxX : maxY;
    for(let i = 0; i < maxSteps; i += 1){
      tempArray = tempArray.concat(fillOutwardBox(Math.floor(centerRow), Math.floor(centerColumn), i));
    }
    showSpiral(tempArray);
  }

  function fillOutwardBox(centerRow, centerColumn, index){
    let temparray = [];

    temparray = temparray.concat(spiralFillLoop(0, 1, 0, -1, 1, 0, centerRow, centerColumn, index));
    temparray = temparray.concat(spiralFillLoop(1, 0, 1, 0, 0, 1, centerRow, centerColumn, index));
    temparray = temparray.concat(spiralFillLoop(0, 1, 0, 1, -1, 0, centerRow, centerColumn, index));
    temparray = temparray.concat(spiralFillLoop(1, 0, -1, 0, 0, -1, centerRow, centerColumn, index));

    return temparray;
  }

  function spiralFillLoop(a, b, c, d, e, f, centerRow, centerColumn, index){
    let temparray = [];
    for(let i = -index + a; i < index + b; i += 1){
      let tempTarget = [centerRow + (i * c) + (index * d), centerColumn + (i * e) +(index * f)];
      if(memoryTable[tempTarget[0]] !== undefined && memoryTable[tempTarget[0]][tempTarget[1]] !== undefined) {
        temparray.push(tempTarget);
      }
    }
    return temparray;
  }

  function showSpiral(arrayOfTargets) {

    for (let i = 0; i < arrayOfTargets.length; i += 1) {
      const targetRow = arrayOfTargets[i][0];
      const targetColumn = arrayOfTargets[i][1];
      const memoryTableTarget = memoryTable[targetRow][targetColumn];
      setTimeoutTimer(targetRow, targetColumn, memoryTableTarget, i);
      memoryTableTarget.checked = true;
      calculateWrongFlags(memoryTableTarget);
    }
  }

  function setTimeoutTimer(targetRow, targetColumn, memoryTableTarget, number){
    spiralTimeoutArray.push(setTimeout(function(){
      const target = gameBox.children().eq(targetRow).children().eq(targetColumn)[0];
      if(memoryTableTarget.hasMine === true && memoryTableTarget.state !== 'flagged' && memoryTableTarget.state !== 'questioned'){
        if(gameStatus.state === 'win'){
          target.classList.add('flag-safe', 'flag');
          updateMinesLeftStatus(-1);
        } else {
          target.classList.add('mine', 'blown');
        }
      } else if(memoryTableTarget.state === 'questioned'){
        memoryTableTarget.hasMine === true ? target.classList.add('questioned-wrong') : target.classList.add('questioned-safe');
      }else if(memoryTableTarget.state === 'visible'){
        target.classList.add('safe');
      } else if(memoryTableTarget.state === 'flagged' ){
        memoryTableTarget.hasMine === true ? target.classList.add('flag-safe') : target.classList.add('flag-broken');
      }  else {
        target.classList.add('blown');
      }
      target.classList.remove('mine-box__hidden');
    }, number * 9));
  }

  function calculateWrongFlags(memoryTableTarget){
    if(memoryTableTarget.state === 'flagged' && memoryTableTarget.hasMine === false){
      gameStatus.wrongMinesFlagged += 1;
    }
  }

  function clearSpiralAnimation(){
    for(let i = 0; i < spiralTimeoutArray.length; i += 1){
      clearTimeout(spiralTimeoutArray[i])
    }
  }

  // ALGORITHM
//


  // have to add some kind of checker when algorithm is about to push coordinates
  //needs to check if the coordinates are possible, if mines can be placed there
  //if not, dont push coordinates to table
  //if possible, push so the probability can be calculated


  let smallVisiblePerimeters = [];
  let algoMemTable = [];


  const basicAlgo = $('.basic-algo');
  const minimalPerimeterAlgo = $('.minimal-perimeter-algo');


  basicAlgo.on('click', function (){
    runBasicAlgorithm();
  });


  function runBasicAlgorithm(){
    algoMemTable = getDataFromMemoryTable();
    const visAndHidPerimeter = getVisibleAndHiddenPerimeter();
    basicVisibleFlag(visAndHidPerimeter[0]);
    basicVisibleUncovering(visAndHidPerimeter[0]);
  }

  minimalPerimeterAlgo.on('click', function (){
    $(minPeriLoader)[0].classList.remove('hidden-loader')
    let dupa = setTimeout(function(){
      algoMemTable = getDataFromMemoryTable();
    const visAndHidPerimeter = getVisibleAndHiddenPerimeter();
    const minimalPerimetersArray = getMinimalPerimeters(visAndHidPerimeter);

    finalArray = [];
    let statisticsArray = [];
    let counter = 0;
    let result;
    for (let i = 0; i < minimalPerimetersArray[0].length; i += 1) {
      finalArray = [];

      combinationGenerator(minimalPerimetersArray[0][i], minimalPerimetersArray[1][i]);

      if (finalArray.length !== 0) {
        statisticsArray.push(finalArray);
        result = possibleActionsFromSmallPerimeterAlgo(finalArray, minimalPerimetersArray[1][i]);
        $(minPeriLoader)[0].classList.add('hidden-loader')

        if(result !== 'iteration failure'){

          break;
        } else{
          counter += 1;
        }
      }
    }
    if(result === 'iteration failure') {
      $(minPeriLoader)[0].classList.add('hidden-loader')
      manageCustomText('algoFail')
      let statisticsForProbabilitiesArray = getStatisticsForProbabilityCalculation(statisticsArray)
      let completeProbabilityCalcArray = calculatePerimeterAndTilesLeft(statisticsForProbabilitiesArray, minimalPerimetersArray[1]);
      calculateProbabilities(completeProbabilityCalcArray);
    }

    }, 500)
  });


  function calculateProbabilities(array){
    let totalPossibleBombArrangementData = calculateTotalPossibleBombArrangements(array);

    for (let i = 0; i < array.length; i += 1) {
      for (let j = 0; j < array[i].combinations.length; j += 1) {

      }
    }


  }

  function calculateBinomialOfAllPossibleBombArrangements(allPosArrangArray){
    for (let i = 0; i < allPosArrangArray.length; i += 1) {
      let allPosArrangArrayElement = allPosArrangArray[i];

    }


  }

  function calculateTotalPossibleBombArrangements(array){
    let numberOfBombsInPerimeter = [];

    for (let i = 0; i < array.length; i += 1) {
      let target = array[i].combinations;
      for (let j = 0; j < target.length; j += 1) {
        let found = false;
        for (let k = 0; k < numberOfBombsInPerimeter.length; k += 1) {
          if(numberOfBombsInPerimeter[k].numberOfBombsInPerimeter === target[j].numberOfBombsInPerimeter){
            numberOfBombsInPerimeter[k].numberOfTimesBombed = numberOfBombsInPerimeter[k].numberOfTimesBombed + target[j].numberOfTimesBombed;
            found = true;
          }

        }
        if(found === false) {
          numberOfBombsInPerimeter.push(
            {
              numberOfBombsInPerimeter: target[j].numberOfBombsInPerimeter,
              numberOfTimesBombed: target[j].numberOfTimesBombed
            }
          )
        }

      }
    }

return numberOfBombsInPerimeter;
  }


  function calculatePerimeterAndTilesLeft(statisticsForProbabilitiesArray, hiddenPerimeterArray){
    for (let i = 0; i < statisticsForProbabilitiesArray.length; i += 1) {
      let lengthOfTargetsPerimeter = getTargetPerimeterLength(statisticsForProbabilitiesArray[i].row, statisticsForProbabilitiesArray[i].column ,hiddenPerimeterArray)
      statisticsForProbabilitiesArray[i].perimeterLength = lengthOfTargetsPerimeter;
      statisticsForProbabilitiesArray[i].tilesLeftHidden = gameStatus.tilesLeft + gameStatus.minesLeft - lengthOfTargetsPerimeter;
    }
    return statisticsForProbabilitiesArray;
  }

  function  getTargetPerimeterLength(row, column, hiddenPerimeterArray){
    let perimeterLength = 0;
    for (let i = 0; i < hiddenPerimeterArray.length; i += 1) {
      for (let j = 0; j < hiddenPerimeterArray[i].length; j += 1) {
        if(hiddenPerimeterArray[i][j][0] === row && hiddenPerimeterArray[i][j][1] === column){
          perimeterLength = hiddenPerimeterArray[i].length;
        }
      }
    }
    return perimeterLength;
  }


  function getStatisticsForProbabilityCalculation(statisticsArray){
    let pushedCoordinates = [];
    let calculationArray = [];

    for (let i = 0; i < statisticsArray.length; i += 1) {
      for (let j = 0; j < statisticsArray[i].length; j += 1) {
        for (let k = 0; k < statisticsArray[i][j].length; k += 1) {
          if (pushedCoordinates.indexOf(statisticsArray[i][j][k]) === -1) {
            pushedCoordinates.push(statisticsArray[i][j][k])
            calculationArray.push(
              {
                row: statisticsArray[i][j][k][0],
                column: statisticsArray[i][j][k][1],
                combinations: [{
                  numberOfBombsInPerimeter: statisticsArray[i][j].length,
                  numberOfTimesBombed: 1
                }],
              }
            )
          } else {
            let index = pushedCoordinates.indexOf(statisticsArray[i][j][k]);
            let target = calculationArray[index].combinations;
            let found = false;
            for (let k = 0; k < target.length; k += 1) {;
              if (target[k].numberOfBombsInPerimeter === statisticsArray[i][j].length) {
                target[k].numberOfTimesBombed += 1;
                found = true;
              }
            }
            if (found === false) {
              target.push({
                numberOfBombsInPerimeter: statisticsArray[i][j].length,
                numberOfTimesBombed: 1
              })
            }
          }
        }
      }

    }
    return calculationArray;
  }

  function possibleActionsFromSmallPerimeterAlgo(bombCombinations, hiddenPerimeterArray){
    if(bombCombinations.length === 1){
      flagSmallPerimeter(bombCombinations[0], 'flagged');
      runBasicAlgorithm();
      return 'flagged';
    } else{
      const repeatingPositions = checkForRepeatingPositions(bombCombinations);
      const missedPositions = checkForImpossiblePositions(bombCombinations, hiddenPerimeterArray)
      if(repeatingPositions !== undefined && missedPositions !== undefined){
        flagSmallPerimeter(repeatingPositions, 'flagged');
        uncoverImpossibleBombPosition(missedPositions, 'visible');
        runBasicAlgorithm();
        return 'uncovered impossible bombs position and flagged viable bomb positions';
      } else if(repeatingPositions !== undefined){
        flagSmallPerimeter(repeatingPositions, 'flagged');
        runBasicAlgorithm();
        return 'flagged combinations';
      } else if(missedPositions.length !== 0){
        uncoverImpossibleBombPosition(missedPositions, 'visible');
        runBasicAlgorithm();
        return 'uncovered impossible bomb position';

      }
    }
    return 'iteration failure';
  }

  function flagSmallPerimeter(surroundingArray, stateChange){
    for (let i = 0; i < surroundingArray.length; i += 1) {
      const target = [surroundingArray[i][0], surroundingArray[i][1]];

      mineBoxRightClick(surroundingArray[i][0], surroundingArray[i][1]);
      algoMemTable[target[0]][target[1]][1] = stateChange;

    }
  }

  function uncoverImpossibleBombPosition(surroundingArray, stateChange){
    for (let i = 0; i < surroundingArray.length; i += 1) {
      const target = [surroundingArray[i][0], surroundingArray[i][1]];

      mineBoxLeftClick(surroundingArray[i][0], surroundingArray[i][1]);
      algoMemTable[target[0]][target[1]][1] = stateChange;
    }
  }

  function checkForImpossiblePositions(bombCombinations, hiddenPerimeterArray) {
    let impossibleBombPositions = [];

    for (let i = 0; i < hiddenPerimeterArray.length; i += 1) {
      let isInArray = false;
      for (let j = 0; j < bombCombinations.length; j += 1) {
        if (bombCombinations[j].indexOf(hiddenPerimeterArray[i]) !== -1) {
          isInArray = true;
          break;
        }
      }
      if (isInArray === false) {
        impossibleBombPositions.push(hiddenPerimeterArray[i]);
      }
    }
    return impossibleBombPositions;
  }

  function checkForRepeatingPositions(bombCombinations){
    let positionInAllCombinations = [];
    for (let i = 0; i < bombCombinations[0].length; i += 1) {
      let isInAll = true;
      for (let j = 0; j < bombCombinations.length; j += 1) {
        if(bombCombinations[j].indexOf(bombCombinations[0][i]) === -1){
          isInAll = false;
        }
      }
      if(isInAll === true){
        positionInAllCombinations.push(bombCombinations[0][i]);
      }
    }

    if(positionInAllCombinations.length !== 0){
      return positionInAllCombinations;
    }
  }

  function getMinimalPerimeters(visAndHidPerimeter){
    const fullVisPerimeter = [...visAndHidPerimeter[0]];
    let siblingArray = [];
    siblingArray.push(fullVisPerimeter[0]);
    fullVisPerimeter.splice(0,1);
    smallVisiblePerimeters = [];
    splitIntoVisPerimeters(siblingArray, fullVisPerimeter);
    let hiddenPerimeters =  prepareHidPerimeters(smallVisiblePerimeters, visAndHidPerimeter[1]);
    return reorderSplitPerimeters(smallVisiblePerimeters, hiddenPerimeters);
  }

  function reorderSplitPerimeters(visiblePerimetersArray, hiddenPerimetersArray){
    let hidArrLength = hiddenPerimetersArray.map(val => val.length);
    return arrangeArraysFromSmallToLarge(visiblePerimetersArray, hiddenPerimetersArray, hidArrLength, [], []);
  }

  function arrangeArraysFromSmallToLarge(visiblePerimetersArray, hiddenPerimetersArray, hidArrLength, orderedVis, orderedHid){
    let minimumLength = Math.min(...hidArrLength);
    let orderedVisArray = orderedVis;
    let orderedHidArray = orderedHid;
    for (let i = 0; i < hiddenPerimetersArray.length; i += 1) {
      if(hiddenPerimetersArray[i].length === minimumLength){
        orderedVisArray.push(visiblePerimetersArray[i]);
        orderedHidArray.push(hiddenPerimetersArray[i]);
      }
    }
    hidArrLength = hidArrLength.filter(val => val !== minimumLength);
    if(hidArrLength.length !== 0){
      return arrangeArraysFromSmallToLarge(visiblePerimetersArray, hiddenPerimetersArray, hidArrLength, orderedVisArray, orderedHidArray);
    } else{
      return [orderedVisArray, orderedHidArray];
    }
  }

  function prepareHidPerimeters(splitPerimeters, fullHiddenPerimeterArray) {
    let finalHidPerimetersArray = [];
    for (let i = 0; i < splitPerimeters.length; i += 1) {
      let tempHidPerimeterArray = [];
      for (let j = 0; j < splitPerimeters[i].length; j += 1) {
        let isHiddenSibling = checkIfIsHiddenSibling(splitPerimeters[i][j], fullHiddenPerimeterArray);
        if (isHiddenSibling !== false) {
          let hiddenSiblingsWithoutDuplicates = removeDuplicates(isHiddenSibling, tempHidPerimeterArray);
          if (hiddenSiblingsWithoutDuplicates !== false) {
            tempHidPerimeterArray = tempHidPerimeterArray.concat(hiddenSiblingsWithoutDuplicates);
          }
        }
      }
      finalHidPerimetersArray.push(tempHidPerimeterArray);
    }
    return finalHidPerimetersArray;
  }

  function removeDuplicates(isHiddenSibling, tempHidPerimeterArray){
    let removedDuplicateArray = [];
    for (let i = 0; i < isHiddenSibling.length; i += 1) {
      let isInArray = false;
      for (let j = 0; j < tempHidPerimeterArray.length; j += 1) {
        if(isHiddenSibling[i][0] === tempHidPerimeterArray[j][0] && isHiddenSibling[i][1] === tempHidPerimeterArray[j][1]){
          isInArray = true;
        }
      }
      if(isInArray === false){
        removedDuplicateArray.push(isHiddenSibling[i]);
      }
    }
    return removedDuplicateArray.length !== 0 ? removedDuplicateArray : false;
  }

  function checkIfIsHiddenSibling(target, hiddenPerimeterArray){
    let possibleSiblingArray = [];
    let actualSiblingArray = [];
    for (let k = 0; k < 8; k += 1) {
      possibleSiblingArray.push([target[0] + surroundingTilesArray[k][0], target[1] + surroundingTilesArray[k][1]]);
    }
    for (let i = 0; i < hiddenPerimeterArray.length; i += 1) {
      for (let j = 0; j < possibleSiblingArray.length; j += 1) {
        if(hiddenPerimeterArray[i][0] === possibleSiblingArray[j][0] && hiddenPerimeterArray[i][1] === possibleSiblingArray[j][1]){
          actualSiblingArray.push(hiddenPerimeterArray[i])
        }
      }
    }
    return actualSiblingArray.length !== 0 ? actualSiblingArray : false;
  }

  function splitIntoVisPerimeters(siblingArray, targetArray){
    let arrayOfSiblings = [...siblingArray];
    let testedArray = [...targetArray];
    let pushed = false;
    for (let i = 0; i < testedArray.length; i += 1) {
      if(checkIfIsSibling(arrayOfSiblings, testedArray[i])){
        arrayOfSiblings.push(testedArray[i]);
        pushed = true;
      }
    }
    if(pushed === true){
      for (let i = 0; i < arrayOfSiblings.length; i += 1) {
        let temp = testedArray.indexOf(arrayOfSiblings[i]);
        if(temp !== -1){
          testedArray.splice(temp, 1);
        }
      }
      if(testedArray.length !== 0){
        splitIntoVisPerimeters(arrayOfSiblings, testedArray);
      } else if( testedArray.length === 0){
        smallVisiblePerimeters.push(arrayOfSiblings);
      }
    } else {
      smallVisiblePerimeters.push(arrayOfSiblings);
      arrayOfSiblings = [];
      if(testedArray.length !== 0) {
        arrayOfSiblings.push(testedArray[0]);
        testedArray.splice(0, 1);
        if(testedArray.length === 0){
          smallVisiblePerimeters.push(arrayOfSiblings);
        } else{
          splitIntoVisPerimeters(arrayOfSiblings, testedArray);
        }
      }
    }
  }

  function checkIfIsSibling(testedArray, target){
    let isSibling = false;
    for (let i = 0; i < testedArray.length; i += 1) {
      if((Math.abs(testedArray[i][0] - target[0]) === 1) && (Math.abs(testedArray[i][1] - target[1]) === 0) || (Math.abs(testedArray[i][1] - target[1]) === 1) && (Math.abs(testedArray[i][0] - target[0]) === 0)){
        isSibling = true;
      }
    }
    return isSibling;
  }

  function getDataFromMemoryTable(){
    let memArrayForAlgo = [];
    for(let i = 0; i < memoryTable.length; i += 1){
      let memAlgoRow = [];
      for (let j = 0; j < memoryTable[i].length; j +=1){
        let memTarget = memoryTable[i][j];
        let coordinates = [memTarget.row, memTarget.column];
        let state = memTarget.state;
        if(state !== 'hidden') {
          let number = memTarget.number;
          let data = [coordinates, state, number];
          memAlgoRow.push(data);
        } else{
          let data = [coordinates, state];
          memAlgoRow.push(data);
        }
      }
      memArrayForAlgo.push(memAlgoRow);
    }
    return memArrayForAlgo;
  }

  //basic Algo
  function basicVisibleFlag(perimeterArray){
    for (let i = 0; i < perimeterArray.length; i += 1) {
      const hiddenSurroundingTiles = getNumberOfHiddenSurroundingTiles(perimeterArray[i][0], perimeterArray[i][1]);
      const testedTileNumber = algoMemTable[perimeterArray[i][0]][perimeterArray[i][1]][2];
      if(hiddenSurroundingTiles[0] === testedTileNumber){
        modifyTheSurroundings(hiddenSurroundingTiles[1], 'flagged');
      }
    }
  }

  function basicVisibleUncovering(perimeterArray){
    for (let i = 0; i < perimeterArray.length; i += 1) {
      const hiddenSurroundingTiles = getNumberOfHiddenSurroundingTiles(perimeterArray[i][0], perimeterArray[i][1]);
      const testedTileNumber = algoMemTable[perimeterArray[i][0]][perimeterArray[i][1]][2];
      if(hiddenSurroundingTiles[2].length === testedTileNumber && hiddenSurroundingTiles[1].length !== 0){
        modifyTheSurroundings(hiddenSurroundingTiles[1], 'visible');
      }
    }
  }

  function modifyTheSurroundings(surroundingArray, stateChange){
    for (let i = 0; i < surroundingArray.length; i += 1) {
      const target = [surroundingArray[i][0][0], surroundingArray[i][0][1]];
      if (memoryTable[target[0]][target[1]].state !== stateChange && stateChange === 'flagged') {
        mineBoxRightClick(surroundingArray[i][0][0], surroundingArray[i][0][1]);
        algoMemTable[target[0]][target[1]][1] = stateChange;
      } else {
        mineBoxLeftClick(surroundingArray[i][0][0], surroundingArray[i][0][1]);
        algoMemTable[target[0]][target[1]][1] = stateChange;
      }
    }
  }

  function getNumberOfHiddenSurroundingTiles(row, column){
    let counter = 0;
    let surroundingFlaggableTilesArray = [];
    let surroundingFlaggedTilesArray = [];
    for (let k = 0; k < 8; k += 1) {
      if (algoMemTable[row + surroundingTilesArray[k][0]] !== undefined && algoMemTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]] !== undefined) {
        const surroundingTile = algoMemTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]];
        if (surroundingTile[1] === 'hidden' || surroundingTile[1] === 'questioned' || surroundingTile[1] === 'flagged') {
          counter += 1;
          if(surroundingTile[1] !== 'flagged') {
            surroundingFlaggableTilesArray.push(surroundingTile);
          } else if(surroundingTile[1] === 'flagged'){
            surroundingFlaggedTilesArray.push(surroundingTile);
          }
        }
      }
    }
    return [counter, surroundingFlaggableTilesArray, surroundingFlaggedTilesArray];
  }
//end basic algo

  function getVisibleAndHiddenPerimeter(){
    let visiblePerimeter = [];
    let hiddenPerimeter = [];
    for(let i = 0; i < algoMemTable.length; i +=1){
      for(let j = 0; j < algoMemTable[0].length; j +=1) {
        if(algoMemTable[i][j][1] === 'hidden'){
          let visibleSurroundingsOfTile =  checkIfSurroundingsVisible(algoMemTable[i][j][0][0], algoMemTable[i][j][0][1]);
          if(visibleSurroundingsOfTile.length > 0){
            hiddenPerimeter.push(algoMemTable[i][j][0]);
          }
          visiblePerimeter = visiblePerimeter.concat(checkIfDuplicate(visiblePerimeter,visibleSurroundingsOfTile));
        }
      }
    }
    return [visiblePerimeter, hiddenPerimeter];
  }

  function checkIfSurroundingsVisible(row, column){
    let visibleTiles = [];
    for (let k = 0; k < 8; k += 1) {
      if (algoMemTable[row + surroundingTilesArray[k][0]] !== undefined && algoMemTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]] !== undefined) {
        const surroundingTile = algoMemTable[row + surroundingTilesArray[k][0]][column + surroundingTilesArray[k][1]];
        if (surroundingTile[1] === 'visible') {
          visibleTiles.push(surroundingTile[0]);
        }
      }
    }
    return visibleTiles;
  }

  function checkIfDuplicate(arrayToCheckAgainst, arrayToCheck){
    let nonDuplicates = [];
    for (let i = 0; i < arrayToCheck.length; i += 1) {
      if (arrayToCheckAgainst.indexOf(arrayToCheck[i]) === -1) {
        nonDuplicates.push(arrayToCheck[i])
      }
    }
    return nonDuplicates
  }

  let finalArray = [];

  function checkIfViable(possibleCombination, arrayToTestAgainst){
    let viable = true;
    for (let i = 0; i < arrayToTestAgainst.length; i += 1) {
      let number = algoMemTable[arrayToTestAgainst[i][0]][arrayToTestAgainst[i][1]][2];
      let foundSurroundingMines = findSurroundingAlgoBombs(arrayToTestAgainst[i], possibleCombination);
      if(number !== foundSurroundingMines){
        viable = false;
        break;
      }
    }
    if(viable === true){
      return possibleCombination;
    } else{
      return false;
    }
  }

  function  findSurroundingAlgoBombs(target, possibleCombination){
    let counter = 0;
    for (let k = 0; k < 8; k += 1) {
      let targetRow = target[0] + surroundingTilesArray[k][0];
      let targetColumn = target[1] + surroundingTilesArray[k][1];
      if (algoMemTable[targetRow] !== undefined && memoryTable[targetRow][targetColumn] !== undefined) {
        const surroundingTile = algoMemTable[targetRow][targetColumn];
        if (surroundingTile[1] === 'flagged') {
          counter += 1;
        } else if(possibleCombination.indexOf(surroundingTile[0]) !== -1){
          counter += 1;
        }
      }
    }
    return counter;
  }

  function combinationGenerator(visPerimeter, hidPerimeter){
    finalArray = [];
    viableCombinations = [];
    for (let i = 0; i <= hidPerimeter.length; i += 1) {
      generateAllPossibleConfigurtions([], hidPerimeter, i, visPerimeter);
    }
    viableCombinations = viableCombinations.filter(val => val.length !== 0);
  }

  let viableCombinations = [];
  function generateAllPossibleConfigurtions(fillerArray, arrayToTest, maxBombs, arrayToTestAgainst) {
    for (let i = 0; i < arrayToTest.length; i += 1) {
      let tempArray = [...fillerArray];
      tempArray.push(arrayToTest[i]);
      if (tempArray.length === maxBombs) {
        let possibleViableCombination = checkIfViable(tempArray, arrayToTestAgainst);
        if(possibleViableCombination !== false) {
          viableCombinations.push(possibleViableCombination);
          finalArray.push(tempArray);
        }
      } else {
        let utilArray = [...arrayToTest];
        utilArray.splice(0, i + 1);
        generateAllPossibleConfigurtions(tempArray, utilArray, maxBombs, arrayToTestAgainst)
      }
    }
  }

  function factorial(number){
    let factorialNumber = 1;
    for (let i = 0; i < number; i += 1) {
      factorialNumber = factorialNumber + factorialNumber * i;
    }
    return factorialNumber;
  }

  function binomialCoefficient(n, k){
    let nFactorial = factorial(n);
    let kFactorial = factorial(k);
    let nMinKFactorial = factorial(n-k);
    return nFactorial/(kFactorial * nMinKFactorial)
  }

  let fourBombs = binomialCoefficient(21, 7);
  let threebombs = binomialCoefficient(21, 8);
  let bigT = threebombs * 4 + fourBombs * 15;
  let probability = (3*threebombs + 9*fourBombs)/bigT;



}());
