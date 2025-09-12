document.addEventListener('DOMContentLoaded', function () {
	
	let correctGrid;
	let shuffleGrid;
	let draggedElement = null;  // Store the element being dragged for touch events
    let originalTouch = { row: null, col: null };  // Track the origin of touch
	let ghostElement = null;    // Ghost element that follows the touch
	let gridRect;  // The bounding rectangle of the grid to calculate relative touch positions
	let swapCount = 15;  // Initialize the swap counter
	let gameOver = false; // Track if the game is over (frozen)
	let currentGrid;
	let savedswapCount = -1;
	let savedGrid;
	let lastPlayed = -1;
	let currentDate;
	let tempGrid = [];
	const GREEN_HEX = '#6fb05c';
	moveCount = 15;
	let gameStatus = true;

	
	
// Get the current date in YYYY-MM-DD format
function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(today.getDate()).padStart(2, '0');
    
    currentDate = `${year}-${month}-${day}`;
    console.log('Date:', currentDate);  // Log the current date here
	console.log('lastPlayed',lastPlayed);
    return currentDate;
}
	
// Save the current game state to localStorage
function saveCurrentGameState() {
    localStorage.setItem('currentGrid', JSON.stringify(currentGrid));  // Save the current grid
	savedGrid = currentGrid;
    localStorage.setItem('savedswapCount', swapCount);  // Save the remaining swaps
	lastPlayed = currentDate;
	localStorage.setItem('lastPlayed', lastPlayed);

}
	
function loadSavedGameState() {
    const savedGrid = localStorage.getItem('currentGrid');  // Load saved grid as 'currentGrid'
    const savedswapCount = localStorage.getItem('swapCount');  // Load saved swap count

    // Check if both the saved grid and swap count are available in localStorage
    if (savedswapCount !== -1) {
        currentGrid = JSON.parse(savedGrid);  // Parse and use the saved grid
        swapCount = parseInt(savedswapCount, 10);  // Parse and use the saved swap count
		swapCount = localStorage.getItem('savedswapCount');  // Load saved swap count

		
        // Display the saved grid and update the UI
        displayGrid(currentGrid);  // Display the loaded grid
        document.getElementById('swap-counter').textContent = `Ruil geleenthede oor: ${swapCount}`;  // Update swap counter display
    } else {
        console.log('No saved game state found. Starting a new game.');
        swapCount = 15;  // Set swap count to default if no saved state is found
    }
}
	
	
// Clear the game state (localStorage) but keep the cookie accept status
function clearGameState() {
    // Check if the user has already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');

    // Clear all other local storage
    localStorage.clear();

    // Restore the cookiesAccepted status after clearing
    if (cookiesAccepted) {
        localStorage.setItem('cookiesAccepted', cookiesAccepted);
    }
}



// Initialize the game by fetching the JSON files
function initGame() {
    const currentDate = getCurrentDate();
    const basePath = `WordGrids/${currentDate}/`;
	
	
	    // If lastPlayed is -1 (no previous save), or the date has changed, clear localStorage
    const savedLastPlayed = localStorage.getItem('lastPlayed');
    if (savedLastPlayed !== currentDate) {
        clearGameState();  // Clear localStorage if it's a new day
    }
	
	
    // Check if the game was completed today
    if (checkIfGameCompletedToday()) {
        fetch(`${basePath}correctGrid.json`)
            .then(response => response.json())
            .then(data => {
                correctGrid = data.correctGrid;
                displayGrid(correctGrid);  // Display the correct grid
				//Retrieve and parse swapCount from localStorage
            	const savedSwapCount = localStorage.getItem('savedswapCount');
            	swapCount = savedSwapCount ? parseInt(savedSwapCount, 10) : 15;  // Default to 15 if not found
			    //swapCount = localStorage.getItem('savedswapCount');  // Load saved swap count
                document.getElementById('status').textContent = 'Jy het klaar jouself bewys vandag. Kom môre weer terug!';
			    document.getElementById('swap-counter').textContent = `Ruil geleenthede oor: ${swapCount}`;  // Update swap counter display
                freezeGame();  // Disable the game
            })
            .catch(error => console.error('Error fetching the correct grid for today:', error));
        return;  // Exit the initGame function to prevent the game from loading
    }

    // Initialize the game by checking for saved state or fetching new grids
    const savedGrid = localStorage.getItem('currentGrid');

    Promise.all([
        fetch(`${basePath}correctGrid.json`).then(response => response.json())
    ])
    .then(data => {
        correctGrid = data[0].correctGrid;

        // If there's a saved grid, load it; otherwise, fetch the shuffle grid
        if (savedGrid) {
            loadSavedGameState();  // Load saved game state

            // Now display the saved current grid along with correct grid
            displayGrid(currentGrid);
        } else {
            // If no saved state, fetch new shuffle grid
            fetch(`${basePath}shuffleGrid.json`)
                .then(response => response.json())
                .then(data => {
                    shuffleGrid = data.shuffleGrid;
                    currentGrid = shuffleGrid;  // Set current grid to shuffled grid

                    // Now display the freshly shuffled grid
                    displayGrid(currentGrid);

                });
        }
    })
    .catch(error => console.error('Error fetching the grids:', error));
}

 

    function displayGrid(grid) {
        const gridContainer = document.getElementById('grid-container');
        gridContainer.innerHTML = ''; // Clear previous content

        const colorGrid = createColorGrid(grid);

        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            for (let colIndex = 0; colIndex < 5; colIndex++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('grid-cell');

                if (grid[rowIndex][colIndex] !== " ") {
                    cellElement.textContent = grid[rowIndex][colIndex];
                    cellElement.draggable = true;
                    cellElement.dataset.row = rowIndex;
                    cellElement.dataset.col = colIndex;

                    cellElement.style.backgroundColor = colorGrid[rowIndex][colIndex];

					// Add event listeners for drag-and-drop
                    cellElement.addEventListener('dragstart', handleDragStart);
                    cellElement.addEventListener('dragover', handleDragOver);
                    cellElement.addEventListener('drop', handleDrop);
					
					// Add touch event listeners for mobile responsiveness
					cellElement.addEventListener('touchstart', handleTouchStart, { passive: true });
                    cellElement.addEventListener('touchmove', handleTouchMove, { passive: false });
                    cellElement.addEventListener('touchend', handleTouchEnd, { passive: true });
                } else {
                    cellElement.textContent = ''; // Empty cells
                }

                gridContainer.appendChild(cellElement);
            }
        }
		// Get the grid container bounding rectangle for relative touch positioning
        gridRect = gridContainer.getBoundingClientRect();
    }

    function createColorGrid(grid) {
        const colorGrid = Array.from({ length: 5 }, () => Array(5).fill('gray'));
		
        // Step 1: Mark all correct (green) blocks
        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            for (let colIndex = 0; colIndex < 5; colIndex++) {
                if (grid[rowIndex][colIndex] === correctGrid[rowIndex][colIndex]) {
                    colorGrid[rowIndex][colIndex] = GREEN_HEX;
                }
            }
			colorGrid[1][1] = 'white';
			colorGrid[1][3] = 'white';
			colorGrid[3][1] = 'white';
			colorGrid[3][3] = 'white';
			
		    correctGrid[1][1] = 'white';
			correctGrid[1][3] = 'white';
			correctGrid[3][1] = 'white';
			correctGrid[3][3] = 'white';
			
        }
		
        // Step 2: Mark orange for the correct row words only, respecting the amount required
        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            if (rowIndex === 0 || rowIndex === 2 || rowIndex === 4) {
                for (let colIndex = 0; colIndex < 5; colIndex++) {
                    if (colorGrid[rowIndex][colIndex] !== GREEN_HEX) {
                        const letter = grid[rowIndex][colIndex];
                        const totalOccurrencesInRow = countOccurrencesInRow(letter, correctGrid, rowIndex);
                        const greenOccurrencesInRow = countOccurrencesInColorInRow(letter, colorGrid, GREEN_HEX, rowIndex);
                        let markedOccurrences = greenOccurrencesInRow;

                        // Check each letter in the row from left to right
                        for (let c = 0; c < 5; c++) {
                            if (colorGrid[rowIndex][c] !== GREEN_HEX && grid[rowIndex][c] === letter) {
                                if (markedOccurrences < totalOccurrencesInRow) {
                                    colorGrid[rowIndex][c] = '#e9ba3a';
                                    markedOccurrences++;
                                } else {
                                    break; // Stop marking orange once the required amount is met
                                }
                            }
                        }
                    }
                }
            }
        }

        // Step 3: Reconsider blocks for coloring based on column words
        colorBlock0x0(grid, colorGrid, correctGrid);
        colorBlock1x0(grid, colorGrid, correctGrid);
        colorBlock2x0(grid, colorGrid, correctGrid);
        colorBlock3x0(grid, colorGrid, correctGrid);
        colorBlock4x0(grid, colorGrid, correctGrid);
        colorBlock0x2(grid, colorGrid, correctGrid);
        colorBlock1x2(grid, colorGrid, correctGrid);
        colorBlock2x2(grid, colorGrid, correctGrid);
        colorBlock3x2(grid, colorGrid, correctGrid);
        colorBlock4x2(grid, colorGrid, correctGrid);
        colorBlock0x4(grid, colorGrid, correctGrid);
        colorBlock1x4(grid, colorGrid, correctGrid);
        colorBlock2x4(grid, colorGrid, correctGrid);
        colorBlock3x4(grid, colorGrid, correctGrid);
        colorBlock4x4(grid, colorGrid, correctGrid);

        return colorGrid;
    }

function colorBlock0x0(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[0][0] !== 'gray') return;

    const letter0x0 = grid[0][0]; // Letter at 0,0
    const totalOccurrences0x0 = countOccurrencesInColumn(letter0x0, correctGrid, 0);
    const correctOccurrences0x0 = countOccurrencesInCorrectPositions(letter0x0, grid, correctGrid, [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]  // First column word
    ]);

    if (totalOccurrences0x0 > correctOccurrences0x0) {
        colorGrid[0][0] = '#e9ba3a';
    }
}
  
  function colorBlock1x0(grid, colorGrid, correctGrid) {
        // Check if the block is green
    if (colorGrid[1][0] === GREEN_HEX) return;

    const letter1x0 = grid[1][0]; // Letter at 1,0
    const totalOccurrences1x0 = countOccurrencesInColumn(letter1x0, correctGrid, 0);
    const correctOccurrences1x0 = countOccurrencesInCorrectPositions(letter1x0, grid, correctGrid, [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]  // First column word
    ]);

    // Determine if the block should be colored orange
    const orangeOccurrencesBefore1x0 = countOccurrencesInPositions(letter1x0, grid, colorGrid, [
        [0, 0]  // Check all prior blocks in the column before the current one
    ]);

    if (totalOccurrences1x0 > correctOccurrences1x0 + orangeOccurrencesBefore1x0) {
        colorGrid[1][0] = '#e9ba3a';
    }
}


function colorBlock2x0(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[2][0] !== 'gray') return;

    const letter2x0 = grid[2][0]; // Letter at 2,0
    const totalOccurrences2x0 = countOccurrencesInColumn(letter2x0, correctGrid, 0);
    const correctOccurrences2x0 = countOccurrencesInCorrectPositions(letter2x0, grid, correctGrid, [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]  // First column word
    ]);

    if (totalOccurrences2x0 > correctOccurrences2x0) {
        colorGrid[2][0] = '#e9ba3a';
    }
}
  
    function colorBlock3x0(grid, colorGrid, correctGrid) {
      
    // Check if the block is green
    if (colorGrid[3][0] === GREEN_HEX) return;

    const letter3x0 = grid[3][0]; // Letter at 3,0
    const totalOccurrences3x0 = countOccurrencesInColumn(letter3x0, correctGrid, 0);
    const correctOccurrences3x0 = countOccurrencesInCorrectPositions(letter3x0, grid, correctGrid, [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]  // First column word
    ]);

    // Determine if the block should be colored orange
    const orangeOccurrencesBefore3x0 = countOccurrencesInPositions(letter3x0, grid, colorGrid, [
        [0, 0], [1, 0], [2, 0]  // Check all prior blocks in the column before the current one
    ]);

    if (totalOccurrences3x0 > correctOccurrences3x0 + orangeOccurrencesBefore3x0) {
        colorGrid[3][0] = '#e9ba3a';
    }
}

function colorBlock4x0(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[4][0] !== 'gray') return;

    const letter4x0 = grid[4][0]; // Letter at 4,0
    const totalOccurrences4x0 = countOccurrencesInColumn(letter4x0, correctGrid, 0);
    const correctOccurrences4x0 = countOccurrencesInCorrectPositions(letter4x0, grid, correctGrid, [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]  // First column word
    ]);

    if (totalOccurrences4x0 > correctOccurrences4x0) {
        colorGrid[4][0] = '#e9ba3a';
    }
}

  function colorBlock0x2(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[0][2] !== 'gray') return;

    const letter0x2 = grid[0][2]; // Letter at 0,2
    const totalOccurrences0x2 = countOccurrencesInColumn(letter0x2, correctGrid, 2);
    const correctOccurrences0x2 = countOccurrencesInCorrectPositions(letter0x2, grid, correctGrid, [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]  // Second column word
    ]);

    if (totalOccurrences0x2 > correctOccurrences0x2) {
        colorGrid[0][2] = '#e9ba3a';
    }
}
  
    function colorBlock1x2(grid, colorGrid, correctGrid) {
    // Check if the block is green
    if (colorGrid[1][2] === GREEN_HEX) return;

    const letter1x2 = grid[1][2]; // Letter at 1,2
    const totalOccurrences1x2 = countOccurrencesInColumn(letter1x2, correctGrid, 2);
    const correctOccurrences1x2 = countOccurrencesInCorrectPositions(letter1x2, grid, correctGrid, [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]  // Second column word
    ]);

    // Determine if the block should be colored orange
    const orangeOccurrencesBefore1x2 = countOccurrencesInPositions(letter1x2, grid, colorGrid, [
        [0, 2]  // Check all prior blocks in the column before the current one
    ]);

    if (totalOccurrences1x2 > correctOccurrences1x2 + orangeOccurrencesBefore1x2) {
        colorGrid[1][2] = '#e9ba3a';
    }
}

function colorBlock2x2(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[2][2] !== 'gray') return;

    const letter2x2 = grid[2][2]; // Letter at 2,2
    const totalOccurrences2x2 = countOccurrencesInColumn(letter2x2, correctGrid, 2);
    const correctOccurrences2x2 = countOccurrencesInCorrectPositions(letter2x2, grid, correctGrid, [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]  // First column word
    ]);

    if (totalOccurrences2x2 > correctOccurrences2x2) {
        colorGrid[2][2] = '#e9ba3a';
    }
}
  
function colorBlock3x2(grid, colorGrid, correctGrid) {
  
    // Check if the block is green
    if (colorGrid[3][2] === GREEN_HEX) return;

    const letter3x2 = grid[3][2]; // Letter at 3,2
    const totalOccurrences3x2 = countOccurrencesInColumn(letter3x2, correctGrid, 2);
    const correctOccurrences3x2 = countOccurrencesInCorrectPositions(letter3x2, grid, correctGrid, [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]  // Second column word
    ]);

    // Determine if the block should be colored orange
    const orangeOccurrencesBefore3x2 = countOccurrencesInPositions(letter3x2, grid, colorGrid, [
        [0, 2], [1, 2], [2, 2]  // Check all prior blocks in the column before the current one
    ]);

    if (totalOccurrences3x2 > correctOccurrences3x2 + orangeOccurrencesBefore3x2) {
        colorGrid[3][2] = '#e9ba3a';
    }
}

function colorBlock4x2(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[4][2] !== 'gray') return;

    const letter4x2 = grid[4][2]; // Letter at 4,2
    const totalOccurrences4x2 = countOccurrencesInColumn(letter4x2, correctGrid, 2);
    const correctOccurrences4x2 = countOccurrencesInCorrectPositions(letter4x2, grid, correctGrid, [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]  // First column word
    ]);

    if (totalOccurrences4x2 > correctOccurrences4x2) {
        colorGrid[4][2] = '#e9ba3a';
    }
}
  
  function colorBlock0x4(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[0][4] !== 'gray') return;

    const letter0x4 = grid[0][4]; // Letter at 0,4
    const totalOccurrences0x4 = countOccurrencesInColumn(letter0x4, correctGrid, 4);
    const correctOccurrences0x4 = countOccurrencesInCorrectPositions(letter0x4, grid, correctGrid, [
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]  // Second column word
    ]);

    if (totalOccurrences0x4 > correctOccurrences0x4) {
        colorGrid[0][4] = '#e9ba3a';
    }
}
  
    function colorBlock1x4(grid, colorGrid, correctGrid) {
      
    // Check if the block is green
    if (colorGrid[1][4] === GREEN_HEX) return;

    const letter1x4 = grid[1][4]; // Letter at 1,4
    const totalOccurrences1x4 = countOccurrencesInColumn(letter1x4, correctGrid, 4);
    const correctOccurrences1x4 = countOccurrencesInCorrectPositions(letter1x4, grid, correctGrid, [
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]  // Third column word
    ]);

    // Determine if the block should be colored orange
    const orangeOccurrencesBefore1x4 = countOccurrencesInPositions(letter1x4, grid, colorGrid, [
        [0, 4]  // Check all prior blocks in the column before the current one
    ]);

    if (totalOccurrences1x4 > correctOccurrences1x4 + orangeOccurrencesBefore1x4) {
        colorGrid[1][4] = '#e9ba3a';
    }
}

function colorBlock2x4(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[2][4] !== 'gray') return;

    const letter2x4 = grid[2][4]; // Letter at 2,4
    const totalOccurrences2x4 = countOccurrencesInColumn(letter2x4, correctGrid, 4);
    const correctOccurrences2x4 = countOccurrencesInCorrectPositions(letter2x4, grid, correctGrid, [
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]  // Third column word
    ]);

    if (totalOccurrences2x4 > correctOccurrences2x4) {
        colorGrid[2][4] = '#e9ba3a';
    }
}
  
    function colorBlock3x4(grid, colorGrid, correctGrid) {
      
    // Check if the block is green
    if (colorGrid[3][4] === GREEN_HEX) return;

    const letter3x4 = grid[3][4]; // Letter at 3,4
    const totalOccurrences3x4 = countOccurrencesInColumn(letter3x4, correctGrid, 4);
    const correctOccurrences3x4 = countOccurrencesInCorrectPositions(letter3x4, grid, correctGrid, [
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]  // Third column word
    ]);

    // Determine if the block should be colored orange
    const orangeOccurrencesBefore3x4 = countOccurrencesInPositions(letter3x4, grid, colorGrid, [
        [0, 4], [1, 4], [2, 4]  // Check all prior blocks in the column before the current one
    ]);

    if (totalOccurrences3x4 > correctOccurrences3x4 + orangeOccurrencesBefore3x4) {
        colorGrid[3][4] = '#e9ba3a';
    }
}

function colorBlock4x4(grid, colorGrid, correctGrid) {
    // Check if the block is gray
    if (colorGrid[4][4] !== 'gray') return;

    const letter4x4 = grid[4][4]; // Letter at 4,4
    const totalOccurrences4x4 = countOccurrencesInColumn(letter4x4, correctGrid, 4);
    const correctOccurrences4x4 = countOccurrencesInCorrectPositions(letter4x4, grid, correctGrid, [
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]  // First column word
    ]);

    if (totalOccurrences4x4 > correctOccurrences4x4) {
        colorGrid[4][4] = '#e9ba3a';
    }
}
  
	
	
	
	
	
	
	
	
	
	
	
	

    // Helper functions

    function countOccurrencesInPositions(letter, grid, colorGrid, positions) {
        let count = 0;
        for (const [row, col] of positions) {
            if (grid[row][col] === letter && colorGrid[row][col] === '#e9ba3a') {
                count++;
            }
        }
        return count;
    }

    function countOccurrencesInRow(letter, grid, rowIndex) {
        return grid[rowIndex].filter(char => char === letter).length;
    }

    function countOccurrencesInColorInRow(letter, colorGrid, color, rowIndex) {
        return colorGrid[rowIndex].filter((_, colIndex) => colorGrid[rowIndex][colIndex] === color && correctGrid[rowIndex][colIndex] === letter).length;
    }

    function countOccurrencesInColumn(letter, grid, colIndex) {
        let count = 0;
        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            if (grid[rowIndex][colIndex] === letter) {
                count++;
            }
        }
        return count;
    }

    function countOccurrencesInCorrectPositions(letter, grid, correctGrid, positions) {
        let count = 0;
        for (const [row, col] of positions) {
            if (grid[row][col] === correctGrid[row][col] && grid[row][col] === letter) {
                count++;
            }
        }
        return count;
    }
	
const GREEN = 'green';  // Define a variable for the green color

function handleDragStart(event) {
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    // Create a copy of the current grid to compare after the touch ends
    tempGrid = currentGrid.map(row => row.slice()); // Shallow copy the grid

    // Prevent dragging of empty blocks or green-marked blocks
    if ((row === 1 && col === 1) || 
        (row === 3 && col === 1) || 
        (row === 1 && col === 3) || 
        (row === 3 && col === 3) 
		//|| (colorGrid[row][col] === GREEN_HEX)  // Use the GREEN variable
       ) {
        event.preventDefault();  // Do not allow dragging of these blocks
        return;
    }
	


    event.dataTransfer.setData('text/plain', `${event.target.dataset.row},${event.target.dataset.col}`);
    event.dataTransfer.effectAllowed = 'move';
	

}



    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

function handleDrop(event) {
    if (swapCount <= 0 || gameOver) return;  // Prevent swaps if no swaps are left or game is over

    event.preventDefault();
    const origin = event.dataTransfer.getData('text/plain').split(',');
    const originRow = parseInt(origin[0]);
    const originCol = parseInt(origin[1]);

    const targetRow = parseInt(event.target.dataset.row);
    const targetCol = parseInt(event.target.dataset.col);
	
    // Prevent dropping onto non-draggable blocks
    if ((targetRow === 1 && targetCol === 1) || 
		(targetRow === 3 && targetCol === 1) || 
		(targetRow === 1 && targetCol === 3) || 
		(targetRow === 3 && targetCol === 3)) {
        return;  // Do not allow dropping onto these blocks
		
    const temp = currentGrid[originRow][originCol];
    currentGrid[originRow][originCol] = currentGrid[targetRow][targetCol];
    currentGrid[targetRow][targetCol] = temp;
    }

    swapGridItems(originRow, originCol, targetRow, targetCol);
	
			        // Check if the grid has changed compared to the tempGrid (grid before the touch event)
        if (!areGridsEqual(tempGrid, currentGrid)) {
            updateSwapCounter(); // Update the swap counter after a valid swap only if grid changed
        }
	
    checkForWin();       // Check if the game is solved
}




// Touch event handler for mobile devices
function handleTouchStart(event) {
    const target = event.target;
    const row = parseInt(target.dataset.row);
    const col = parseInt(target.dataset.col);
	
	// Create a copy of the current grid to compare after the touch ends
    tempGrid = currentGrid.map(row => row.slice()); // Shallow copy the grid

    // Prevent dragging of empty blocks on mobile
    if ((row === 1 && col === 1) || 
		(row === 3 && col === 1) || 
		(row === 1 && col === 3) || 
		(row === 3 && col === 3) 
		//||	   (colorGrid[row][col] === GREEN_HEX)  // Use the GREEN variable
	   ) {
        return;  // Do not allow dragging of these blocks
    }

    draggedElement = target;
    originalTouch = { row: target.dataset.row, col: target.dataset.col };

    // Create a ghost element that follows the touch
    ghostElement = target.cloneNode(true);
    ghostElement.classList.add('ghost'); // Add a CSS class for the ghost element
    document.body.appendChild(ghostElement);

    // Position the ghost at the initial touch point
    const touch = event.touches[0];
    moveGhost(touch.clientX, touch.clientY);
    target.classList.add('dragging'); // Visual feedback for dragging
}

    function handleTouchMove(event) {
		if (gameOver) return;  // Prevent touch events if the game is over
		
        event.preventDefault();  // Prevent default scrolling behavior during touch move

        const touch = event.touches[0];
        moveGhost(touch.clientX, touch.clientY);
    }

function handleTouchEnd(event) {
    // If no element is being dragged, ghost element is missing, swap count is zero, or game is over, exit early
    if (!draggedElement || !ghostElement || swapCount <= 0 || gameOver) {
        cleanupDrag();
        return;
    }

    // Simulate the drop event using the touch position
    const target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);

    // Ensure the target is a valid grid cell
    if (target && target.classList.contains('grid-cell')) {
        const originRow = parseInt(originalTouch.row);
        const originCol = parseInt(originalTouch.col);
        const targetRow = parseInt(target.dataset.row);
        const targetCol = parseInt(target.dataset.col);

        // Prevent dropping onto non-draggable blocks
        const isUndraggableBlock = 
            (targetRow === 1 && targetCol === 1) || 
            (targetRow === 3 && targetCol === 1) || 
            (targetRow === 1 && targetCol === 3) || 
            (targetRow === 3 && targetCol === 3) 
		//|| (colorGrid[targetRow][targetCol] === GREEN_HEX)
		;  // Check if the target block is green

        if (isUndraggableBlock) {
            cleanupDrag(); // Remove ghost element and reset drag state
            return;  // Do not allow swapping with undraggable blocks
        }

        // Swap the grid items and update the swap count if the drop is valid
        swapGridItems(originRow, originCol, targetRow, targetCol);
        
        // Check if the grid has changed compared to the tempGrid (grid before the touch event)
        if (!areGridsEqual(tempGrid, currentGrid)) {
            updateSwapCounter(); // Update the swap counter after a valid swap only if the grid changed
        }

        checkForWin(); // Check if the game is solved
    }

    cleanupDrag(); // Ensure proper cleanup after touch ends
}


	
	// Function to compare if two grids are the same
function areGridsEqual(grid1, grid2) {
    for (let rowIndex = 0; rowIndex < grid1.length; rowIndex++) {
        for (let colIndex = 0; colIndex < grid1[rowIndex].length; colIndex++) {
            if (grid1[rowIndex][colIndex] !== grid2[rowIndex][colIndex]) {
                return false;  // If any cell is different, grids are not equal
            }
        }
    }
    return true;  // If all cells are the same, grids are equal
}
	
	
	

	function cleanupDrag() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
    }

    if (ghostElement && document.body.contains(ghostElement)) {
        document.body.removeChild(ghostElement);  // Remove the ghost element
    }

    draggedElement = null;
    ghostElement = null;
}

	
	 // Function to move the ghost element
    function moveGhost(x, y) {
        ghostElement.style.position = 'absolute';
        ghostElement.style.left = `${x - ghostElement.offsetWidth / 2}px`;
        ghostElement.style.top = `${y - ghostElement.offsetHeight / 2}px`;
        ghostElement.style.zIndex = '1000'; // Ensure the ghost is on top
    }
	
	
	
// Function to swap two items in the grid with animation
function swapGridItems(originRow, originCol, targetRow, targetCol) {
    const originCell = document.querySelector(`[data-row="${originRow}"][data-col="${originCol}"]`);
    const targetCell = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);

    // Get the pixel distances for the animation
    const originRect = originCell.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();

    const deltaX = targetRect.left - originRect.left;
    const deltaY = targetRect.top - originRect.top;

    // Ensure dragged block moves instantly to its final position
    originCell.style.transition = 'none';  // Disable transition initially
    originCell.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    originCell.style.opacity = '0';  // Hide the origin block immediately

    // Force the repaint of the element so the transition starts correctly
    originCell.offsetHeight;  // Trigger reflow to ensure the next transition is applied

    // Apply a very fast animation for the dragged block to appear instantly in its new location
    setTimeout(() => {
        originCell.style.transition = 'opacity 0.1s ease, transform 0.1s ease';  // Fast transition for the dragged block
        originCell.style.opacity = '1';  // Make dragged block visible in the new location
    }, 0);

    // Apply animation to the target block (the one that needs to swap)
    targetCell.style.transition = 'transform 0.5s ease';  // Normal animation for target block
    targetCell.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;  // Move target block to origin
    targetCell.style.zIndex = 10;  // Ensure the target block appears on top

    // Disable interaction during the animation
    document.getElementById('grid-container').style.pointerEvents = 'none';

    // Swap the grid items in the data structure immediately
    const temp = currentGrid[originRow][originCol];
    currentGrid[originRow][originCol] = currentGrid[targetRow][targetCol];
    currentGrid[targetRow][targetCol] = temp;

    // After the animation completes, reset the transformations and re-render the grid
    setTimeout(() => {
        // Reset the origin and target cells after the animation
        originCell.style.transition = '';
        originCell.style.transform = '';
        targetCell.style.transition = '';
        targetCell.style.transform = '';
        targetCell.style.zIndex = '';  // Reset z-index after animation

        displayGrid(currentGrid);  // Refresh the grid to reflect the updated state

        // Re-enable interaction after the animation completes
        document.getElementById('grid-container').style.pointerEvents = 'auto';
    }, 500);  // Match the animation duration
}


	
// Update the swap counter display
function updateSwapCounter() {
    // Check if savedswapCount has been loaded (-1 means it hasn't been loaded yet)
    if (savedswapCount === -1) {
        // Load savedswapCount from localStorage
        const storedSwapCount = localStorage.getItem('savedswapCount');
        if (storedSwapCount !== null && !isNaN(storedSwapCount)) {
            swapCount = parseInt(storedSwapCount, 10);  // Load the stored swap count if it exists
        } else {
            swapCount = 15;  // Set to default if no saved value is found
        }
    }

    // Decrease the swap count during gameplay
    if (swapCount > 0) {
        swapCount--;  // Decrease swap count
        savedswapCount = swapCount;
    }

    // Update the swap counter display
    document.getElementById('swap-counter').textContent = `Ruil geleenthede oor: ${swapCount}`;

    // Save the current game state, including the swap count
    saveCurrentGameState();

    // Check if swaps reach 0
    if (swapCount <= 0) {
        if (!areGridsEqual2(currentGrid, correctGrid)) {
            // If the grids are not equal, declare the game as failed
            document.getElementById('status').textContent = 'Jy het gefaal! Die raaisel is nie opgelos nie.';
            freezeGame();  // Freeze the game when the game is failed
			
       // } else {
       //     // If the grids are equal, show a win message
       //     document.getElementById('status').textContent = 'Jy het al jou ruilkanse verbeur, maar jy het gewen!';
       //     freezeGame();  // Freeze the grid if the game is won
        }
        saveCurrentGameState();  // Save the current state after freezing
    }
}

// Function to check if two grids are equal
function areGridsEqual2(grid1, grid2) {
    for (let row = 0; row < grid1.length; row++) {
        for (let col = 0; col < grid1[row].length; col++) {
            if (grid1[row][col] !== grid2[row][col]) {
                gameStatus = false;
                localStorage.setItem('gameStatusLocal', 'false');  // Set the gameStatusLocal in localStorage

                // Fetch the gameStatusLocal after setting it
                const gameStatusLocal = localStorage.getItem('gameStatusLocal');
                console.log("FAILED");
                console.log('gameStatus:', gameStatus);
                console.log('gameStatusLocal:', gameStatusLocal);
				document.getElementById('status').textContent = 'Jy het al jou raai geleenthede verbeur. Probeer weer môre!';

                return false;  // If any cell is different, the grids are not equal
            }
        }
    }

    // If grids are equal, update the game status and localStorage
    gameStatus = true;
    localStorage.setItem('gameStatusLocal', 'true');  // Set the gameStatusLocal in localStorage

    // Fetch and log the updated gameStatusLocal
    const gameStatusLocal = localStorage.getItem('gameStatusLocal');
    console.log('gameStatus:', gameStatus);
    console.log('gameStatusLocal:', gameStatusLocal);

    return true;  // Grids are equal if no differences are found
}




	
	
	
	
function checkForWin() {
    let isSolved = true;  // Assume the puzzle is solved

    // Step 1: Check all columns for rows 0, 2, and 4
    const rowsToCheck = [0, 2, 4];
    for (let rowIndex of rowsToCheck) {
        for (let colIndex = 0; colIndex < 5; colIndex++) {
            if (currentGrid[rowIndex][colIndex] !== correctGrid[rowIndex][colIndex]) {
                isSolved = false;
                break;
            }
        }
        if (!isSolved) break;  // Exit if a mismatch is found
    }

    // Step 2: Check all rows for columns 0, 2, and 4
    const colsToCheck = [0, 2, 4];
    for (let colIndex of colsToCheck) {
        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            // Skip checking the blank blocks (1,1), (1,3), (3,1), and (3,3)
            if ((rowIndex === 1 && colIndex === 1) ||
                (rowIndex === 1 && colIndex === 3) ||
                (rowIndex === 3 && colIndex === 1) ||
                (rowIndex === 3 && colIndex === 3)) {
                continue;  // Skip the blank blocks
            }

            if (currentGrid[rowIndex][colIndex] !== correctGrid[rowIndex][colIndex]) {
                isSolved = false;
                break;
            }
        }
        if (!isSolved) break;  // Exit if a mismatch is found
    }

    // Display win status
    if (isSolved) {
        document.getElementById('status').textContent = 'Wragtag kry jy hom!';
        freezeGame();  // Freeze the game once solved
		markGameAsCompleted();  // Mark the game as completed for today
		localStorage.removeItem('currentGrid');  // Remove the saved state
		swapCount = localStorage.getItem('savedswapCount');  // Load saved swap count
    } else {
        document.getElementById('status').textContent = ''; // Clear status if not solved
    }
}

// Check if the game has already been completed today
function checkIfGameCompletedToday() {
    const lastCompletedDate = localStorage.getItem('lastCompletedDate');
    const currentDate = getCurrentDate();
		
    // If the last completed date matches the current date, return true (game already completed)
    return lastCompletedDate === currentDate;
}
	
	// Mark the game as completed by saving the current date
function markGameAsCompleted() {
    const currentDate = getCurrentDate();
    localStorage.setItem('lastCompletedDate', currentDate);
}


// Freeze the game (disable drag and touch events)
function freezeGame() {
    gameOver = true;  // Set a flag to indicate that the game is over

    // Disable all further drag-and-drop or touch events by removing event listeners
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
        cell.removeEventListener('dragstart', handleDragStart);
        cell.removeEventListener('dragover', handleDragOver);
        cell.removeEventListener('drop', handleDrop);
        cell.removeEventListener('touchstart', handleTouchStart);
        cell.removeEventListener('touchmove', handleTouchMove);
        cell.removeEventListener('touchend', handleTouchEnd);
        // Display the share button
		moveCount = swapCount;
        document.getElementById('share-btn').style.display = 'block';
    });
}
	
	
// Function to get the star rating based on the swap count
function getStarRating(swapCount) {
	
	const gameStatusLocal = localStorage.getItem('gameStatusLocal');
	gameStatus = gameStatusLocal === 'false' ? false : true;    // Convert to boolean
	savedSwapCount = localStorage.getItem('savedswapCount');
	
    swapCount = savedSwapCount ? parseInt(savedSwapCount, 10) : 15;  // Default to 15 if not found
	
    if (swapCount >= 5) {
        return '🟩🟩🟩🟩🟩\n🟩⭐🟩⭐🟩\n🟩🟩⭐🟩🟩\n🟩⭐🟩⭐🟩\n🟩🟩🟩🟩🟩'; // 5 stars
 	} else if (swapCount === 0 && !gameStatus) {
        // If gameStatus is false and swapCount is 0, mark as fail
        return '🟩🟩🟩🟩🟩\n🟩⬛🟩⬛🟩\n🟩🟩⬛🟩🟩\n🟩⬛🟩⬛🟩\n🟩🟩🟩🟩🟩'; // fail
    } else if (swapCount === 4) {
        return '🟩🟩🟩🟩🟩\n🟩⭐🟩⭐🟩\n🟩🟩⭐🟩🟩\n🟩⭐🟩⬜🟩\n🟩🟩🟩🟩🟩'; // 4 stars
    } else if (swapCount === 3) {
        return '🟩🟩🟩🟩🟩\n🟩⭐🟩⭐🟩\n🟩🟩⭐🟩🟩\n🟩⬜🟩⬜🟩\n🟩🟩🟩🟩🟩'; // 3 stars
    } else if (swapCount === 2) {
        return '🟩🟩🟩🟩🟩\n🟩⭐🟩⬜🟩\n🟩🟩⭐🟩🟩\n🟩⬜🟩⬜🟩\n🟩🟩🟩🟩🟩'; // 2 stars
    } else if (swapCount === 1) {
        return '🟩🟩🟩🟩🟩\n🟩⬜🟩⬜🟩\n🟩🟩⭐🟩🟩\n🟩⬜🟩⬜🟩\n🟩🟩🟩🟩🟩'; // 1 star
    } else if (swapCount === 0) {
        return '🟩🟩🟩🟩🟩\n🟩⬜🟩⬜🟩\n🟩🟩⬜🟩🟩\n🟩⬜🟩⬜🟩\n🟩🟩🟩🟩🟩'; // 0 stars
    }
}
	
	
// Share button
document.getElementById('share-btn').addEventListener('click', function () {
    const stars = getStarRating(swapCount); // Get the star rating
    const gameStatusLocal = localStorage.getItem('gameStatusLocal');
    const gameStatus = gameStatusLocal === 'false' ? false : true; // Convert to boolean
    const savedSwapCount = parseInt(localStorage.getItem('savedswapCount'), 10); // Convert to integer

    let shareData;

    // Check if the game was failed
    if (savedSwapCount === 0 && !gameStatus) {
        shareData = {
            title: `AfriWafel op ${currentDate}`,
            text: `AfriWafel ${currentDate}: X/5\n\n${stars}\n\n`,
            url: 'https://afriwafel.co.za' // URL to the game
        };
    } else {
        // If the game was won
        shareData = {
            title: `AfriWafel op ${currentDate}`,
            text: `AfriWafel ${currentDate}: ${swapCount}/5\n\n${stars}\n\n`,
            url: 'https://afriwafel.co.za' // URL to the game
        };
    }

    // Check if the Web Share API is supported by the browser
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing:', error));
    } else {
        alert('Sharing is not supported by your browser.');
    }
});

	


	    // Check if the user has already accepted cookies
    if (!localStorage.getItem('cookiesAccepted')) {
        document.getElementById('cookie-consent-banner').style.display = 'block';
    }

    // When the user clicks "Accept"
    document.getElementById('accept-cookies').addEventListener('click', function () {
        // Hide the banner
        document.getElementById('cookie-consent-banner').style.display = 'none';
        // Store the consent in localStorage
        localStorage.setItem('cookiesAccepted', 'true');
    });
	

    // Fetch the grids and start the game
    initGame();
	
	
});
