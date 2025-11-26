const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const suitColors = {
    '♠': '#000',
    '♣': '#000',
    '♥': '#e74c3c',
    '♦': '#e74c3c'
};

let selectedHoleCards = [];
let selectedCommunityCards = [];
let calculationTimeout = null;
let isCalculating = false;
let selectedHoleRank = null;
let selectedCommunityRank = null;
let gamePhase = 'preflop'; // preflop, flop, turn, river
const phaseLimits = {
    'preflop': 0,
    'flop': 3,
    'turn': 4,
    'river': 5
};
let simulationDetails = []; // Store all simulation details

// Create card deck
function createDeck() {
    const deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

// Initialize card selection UI
function initCardSelection() {
    // Initialize rank buttons for hole cards
    const holeRankDiv = document.getElementById('holeRankSelection');
    ranks.forEach(rank => {
        const btn = document.createElement('button');
        btn.className = 'rank-btn';
        btn.textContent = rank;
        btn.dataset.rank = rank;
        btn.onclick = () => selectRank(rank, 'hole');
        holeRankDiv.appendChild(btn);
    });

    // Initialize suit buttons for hole cards
    const holeSuitDiv = document.getElementById('holeSuitSelection');
    suits.forEach(suit => {
        const btn = document.createElement('button');
        btn.className = 'suit-btn';
        btn.textContent = suit;
        btn.dataset.suit = suit;
        btn.onclick = () => selectSuit(suit, 'hole');
        holeSuitDiv.appendChild(btn);
    });

    // Initialize rank buttons for community cards
    const communityRankDiv = document.getElementById('communityRankSelection');
    ranks.forEach(rank => {
        const btn = document.createElement('button');
        btn.className = 'rank-btn';
        btn.textContent = rank;
        btn.dataset.rank = rank;
        btn.onclick = () => selectRank(rank, 'community');
        communityRankDiv.appendChild(btn);
    });

    // Initialize suit buttons for community cards
    const communitySuitDiv = document.getElementById('communitySuitSelection');
    suits.forEach(suit => {
        const btn = document.createElement('button');
        btn.className = 'suit-btn';
        btn.textContent = suit;
        btn.dataset.suit = suit;
        btn.onclick = () => selectSuit(suit, 'community');
        communitySuitDiv.appendChild(btn);
    });
}

// Select rank
function selectRank(rank, type) {
    if (type === 'hole') {
        selectedHoleRank = rank;
    } else {
        selectedCommunityRank = rank;
    }
    updateRankButtonStates();
}

// Select suit and add card
function selectSuit(suit, type) {
    const selectedRank = type === 'hole' ? selectedHoleRank : selectedCommunityRank;
    const list = type === 'hole' ? selectedHoleCards : selectedCommunityCards;
    
    if (!selectedRank) {
        showError('Please select a rank first');
        return;
    }

    const card = { rank: selectedRank, suit };
    const index = list.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    
    if (index > -1) {
        // Remove card if already selected
        list.splice(index, 1);
    } else {
        // Check limits
        if (type === 'hole' && list.length >= 2) {
            showError('You can only select 2 hole cards');
            return;
        }
        if (type === 'community') {
            const maxCards = phaseLimits[gamePhase];
            if (list.length >= maxCards) {
                showError(`You can only select ${maxCards} community cards in ${gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}`);
                return;
            }
        }
        // Check if card is already selected in the other list
        const allCards = [...selectedHoleCards, ...selectedCommunityCards];
        if (allCards.some(c => c.rank === card.rank && c.suit === card.suit)) {
            showError('This card is already selected');
            return;
        }
        list.push(card);
    }
    
    // Clear selected rank after adding card
    if (type === 'hole') {
        selectedHoleRank = null;
    } else {
        selectedCommunityRank = null;
    }
    
    updateCardDisplay();
    updateRankButtonStates();
    hideError();
    autoCalculate();
}

// Update card display
function updateCardDisplay() {
    const holeDisplay = document.getElementById('selectedHoleCards');
    const communityDisplay = document.getElementById('selectedCommunityCards');
    
    holeDisplay.innerHTML = selectedHoleCards.map((card, index) => 
        `<div class="selected-card" onclick="removeCard(${index}, 'hole')" style="cursor: pointer;">${card.rank}${card.suit}</div>`
    ).join('');
    
    communityDisplay.innerHTML = selectedCommunityCards.map((card, index) => 
        `<div class="selected-card" onclick="removeCard(${index}, 'community')" style="cursor: pointer;">${card.rank}${card.suit}</div>`
    ).join('');
}

// Remove card
function removeCard(index, type) {
    if (type === 'hole') {
        selectedHoleCards.splice(index, 1);
    } else {
        selectedCommunityCards.splice(index, 1);
    }
    updateCardDisplay();
    autoCalculate();
}

// Set game phase
function setGamePhase(phase) {
    gamePhase = phase;
    const maxCards = phaseLimits[phase];
    
    // Remove excess cards if switching to earlier phase
    if (selectedCommunityCards.length > maxCards) {
        selectedCommunityCards = selectedCommunityCards.slice(0, maxCards);
    }
    
    // Update phase button states
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.phase === phase);
    });
    
    // Update phase info
    const phaseNames = {
        'preflop': 'Pre-Flop',
        'flop': 'Flop',
        'turn': 'Turn',
        'river': 'River'
    };
    document.getElementById('phaseInfo').textContent = 
        `Select up to ${maxCards} community card${maxCards !== 1 ? 's' : ''} (${phaseNames[phase]})`;
    
    // Clear selected community rank
    selectedCommunityRank = null;
    updateRankButtonStates();
    updateCardDisplay();
    autoCalculate();
}

// Update rank button states
function updateRankButtonStates() {
    // Update hole rank buttons
    document.querySelectorAll('#holeRankSelection .rank-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.rank === selectedHoleRank);
    });

    // Update community rank buttons
    document.querySelectorAll('#communityRankSelection .rank-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.rank === selectedCommunityRank);
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(hideError, 3000);
}

// Hide error message
function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

// Auto-calculate with debounce
function autoCalculate() {
    if (calculationTimeout) {
        clearTimeout(calculationTimeout);
    }
    
    calculationTimeout = setTimeout(() => {
        if (!isCalculating) {
            calculateOdds();
        }
    }, 300);
}

// Evaluate poker hand
function evaluateHand(cards) {
    if (cards.length < 5) return null;
    
    const rankCounts = {};
    const suitCounts = {};
    const rankValues = [];
    
    cards.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        rankValues.push(getRankValue(card.rank));
    });
    
    rankValues.sort((a, b) => b - a);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = Object.values(suitCounts).some(count => count >= 5);
    const isStraight = checkStraight(rankValues);
    
    // Royal flush
    if (isFlush && isStraight && rankValues.includes(14) && rankValues.includes(13)) {
        return { strength: 9, name: 'Royal Flush' };
    }
    // Straight flush
    if (isFlush && isStraight) {
        return { strength: 8, name: 'Straight Flush' };
    }
    // Four of a kind
    if (counts[0] === 4) {
        return { strength: 7, name: 'Four of a Kind' };
    }
    // Full house
    if (counts[0] === 3 && counts[1] === 2) {
        return { strength: 6, name: 'Full House' };
    }
    // Flush
    if (isFlush) {
        return { strength: 5, name: 'Flush' };
    }
    // Straight
    if (isStraight) {
        return { strength: 4, name: 'Straight' };
    }
    // Three of a kind
    if (counts[0] === 3) {
        return { strength: 3, name: 'Three of a Kind' };
    }
    // Two pair
    if (counts[0] === 2 && counts[1] === 2) {
        return { strength: 2, name: 'Two Pair' };
    }
    // One pair
    if (counts[0] === 2) {
        return { strength: 1, name: 'One Pair' };
    }
    // High card
    return { strength: 0, name: 'High Card' };
}

// Get rank value for comparison
function getRankValue(rank) {
    const values = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
    return values[rank];
}

// Check for straight
function checkStraight(rankValues) {
    const unique = [...new Set(rankValues)].sort((a, b) => b - a);
    if (unique.length < 5) return false;
    
    // Check for regular straight
    for (let i = 0; i <= unique.length - 5; i++) {
        let consecutive = true;
        for (let j = 1; j < 5; j++) {
            if (unique[i + j] !== unique[i] - j) {
                consecutive = false;
                break;
            }
        }
        if (consecutive) return true;
    }
    
    // Check for A-2-3-4-5 straight
    if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) {
        return true;
    }
    
    return false;
}

// Get best 5-card hand from 7 cards
function getBestHand(cards) {
    if (cards.length < 5) return null;
    if (cards.length === 5) return evaluateHand(cards);
    
    // Try all combinations of 5 cards from 7
    let bestHand = null;
    const combinations = getCombinations(cards, 5);
    
    combinations.forEach(combo => {
        const hand = evaluateHand(combo);
        if (!bestHand || hand.strength > bestHand.strength || 
            (hand.strength === bestHand.strength && compareHands(hand, bestHand, combo, cards) > 0)) {
            bestHand = hand;
        }
    });
    
    return bestHand;
}

// Get combinations
function getCombinations(arr, k) {
    if (k === 1) return arr.map(x => [x]);
    const combos = [];
    for (let i = 0; i <= arr.length - k; i++) {
        const head = arr[i];
        const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
        tailCombos.forEach(tail => combos.push([head, ...tail]));
    }
    return combos;
}

// Compare hands (simplified)
function compareHands(hand1, hand2, cards1, cards2) {
    if (hand1.strength !== hand2.strength) return hand1.strength - hand2.strength;
    return 0;
}

// Calculate odds using Monte Carlo simulation
function calculateOdds() {
    if (isCalculating) return;
    
    hideError();
    
    const numDecks = parseInt(document.getElementById('numDecks').value);
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    
    if (selectedHoleCards.length !== 2) {
        document.getElementById('winProb').textContent = '-';
        document.getElementById('tieProb').textContent = '-';
        document.getElementById('lossProb').textContent = '-';
        document.getElementById('bestHand').textContent = 'Select 2 hole cards';
        document.getElementById('winIndicatorValue').textContent = '';
        return;
    }
    
    if (numPlayers < 2 || numPlayers > 10) {
        document.getElementById('winProb').textContent = '-';
        document.getElementById('tieProb').textContent = '-';
        document.getElementById('lossProb').textContent = '-';
        document.getElementById('bestHand').textContent = 'Invalid players';
        document.getElementById('winIndicatorValue').textContent = '';
        showError('Number of players must be between 2 and 10');
        return;
    }
    
    if (numDecks < 1 || numDecks > 10) {
        document.getElementById('winProb').textContent = '-';
        document.getElementById('tieProb').textContent = '-';
        document.getElementById('lossProb').textContent = '-';
        document.getElementById('bestHand').textContent = 'Invalid decks';
        document.getElementById('winIndicatorValue').textContent = '';
        showError('Number of decks must be between 1 and 10');
        return;
    }
    
    isCalculating = true;
    
    // Get all known cards
    const knownCards = [...selectedHoleCards, ...selectedCommunityCards];
    
    // Calculate best current hand
    const allCards = [...selectedHoleCards, ...selectedCommunityCards];
    let currentBestHand = null;
    if (allCards.length >= 5) {
        currentBestHand = getBestHand(allCards);
    }
    
    // Monte Carlo simulation (run asynchronously)
    const simulations = 50000;
    let wins = 0;
    let ties = 0;
    let losses = 0;
    let sim = 0;
    simulationDetails = []; // Clear previous simulations
    
    console.log(`Starting simulation with ${simulations} iterations...`);
    
    // Track hand type probabilities
    const handCounts = {
        'Royal Flush': 0,
        'Straight Flush': 0,
        'Four of a Kind': 0,
        'Full House': 0,
        'Flush': 0,
        'Straight': 0,
        'Three of a Kind': 0,
        'Two Pair': 0,
        'One Pair': 0,
        'High Card': 0
    };
    
    function runSimulation() {
        const batchSize = 100;
        const endSim = Math.min(sim + batchSize, simulations);
        
        for (; sim < endSim; sim++) {
            // Create deck excluding known cards
            const deck = [];
            for (let d = 0; d < numDecks; d++) {
                const singleDeck = createDeck();
                deck.push(...singleDeck);
            }
            
            // Remove known cards
            const availableDeck = deck.filter(card => 
                !knownCards.some(known => known.rank === card.rank && known.suit === card.suit)
            );
            
            // Shuffle
            const shuffled = [...availableDeck].sort(() => Math.random() - 0.5);
            
            // Complete community cards if needed
            const neededCommunity = 5 - selectedCommunityCards.length;
            const community = [...selectedCommunityCards];
            for (let i = 0; i < neededCommunity; i++) {
                community.push(shuffled[i]);
            }
            
            // Deal opponent cards and evaluate
            const playerCards = [...selectedHoleCards, ...community];
            const playerHand = getBestHand(playerCards);
            
            if (!playerHand) {
                losses++;
                // Store all simulations (including duplicates)
                simulationDetails.push({
                    result: 'loss',
                    playerHand: { name: 'No Hand' },
                    opponentHand: { name: 'Unknown' },
                    communityCards: community
                });
                continue;
            }
            
            // Evaluate all opponents' hands
            const opponentHands = [];
            for (let p = 0; p < numPlayers - 1; p++) {
                const opponentHole = [shuffled[neededCommunity + p * 2], shuffled[neededCommunity + p * 2 + 1]];
                const opponentCards = [...opponentHole, ...community];
                const opponentHand = getBestHand(opponentCards);
                if (opponentHand) {
                    opponentHands.push(opponentHand);
                }
            }
            
            // Compare against all opponents
            let playerWins = true;
            let playerTies = false;
            let bestOpponentHand = null;
            let maxOpponentStrength = -1;
            let playersWithBetterHand = 0;
            let playersWithEqualHand = 0;
            
            for (const opponentHand of opponentHands) {
                if (opponentHand.strength > playerHand.strength) {
                    playersWithBetterHand++;
                    if (opponentHand.strength > maxOpponentStrength) {
                        maxOpponentStrength = opponentHand.strength;
                        bestOpponentHand = opponentHand;
                    }
                } else if (opponentHand.strength === playerHand.strength) {
                    playersWithEqualHand++;
                    if (!bestOpponentHand || opponentHand.strength >= bestOpponentHand.strength) {
                        bestOpponentHand = opponentHand;
                    }
                }
            }
            
            // Determine result: win if no one beats you, tie if someone ties and no one beats you, loss otherwise
            if (playersWithBetterHand > 0) {
                playerWins = false;
                playerTies = false;
            } else if (playersWithEqualHand > 0) {
                playerWins = false;
                playerTies = true;
            } else {
                playerWins = true;
                playerTies = false;
            }
            
            // Track hand type
            if (playerHand && playerHand.name) {
                if (handCounts.hasOwnProperty(playerHand.name)) {
                    handCounts[playerHand.name]++;
                }
            }
            
            // Store all simulations (including duplicates)
            const resultKey = playerTies ? 'tie' : (playerWins ? 'win' : 'loss');
            simulationDetails.push({
                result: resultKey,
                playerHand: playerHand,
                opponentHand: bestOpponentHand || { name: 'No Hand' },
                communityCards: community
            });
            
            if (playerTies) {
                ties++;
            } else if (playerWins) {
                wins++;
            } else {
                losses++;
            }
        }
        
        if (sim < simulations) {
            // Update progress periodically
            if (sim % 500 === 0) {
                const winProb = ((wins / sim) * 100).toFixed(1);
                const tieProb = ((ties / sim) * 100).toFixed(1);
                const lossProb = ((losses / sim) * 100).toFixed(1);
                document.getElementById('winProb').textContent = winProb + '%';
                document.getElementById('tieProb').textContent = tieProb + '%';
                document.getElementById('lossProb').textContent = lossProb + '%';
                        updateWinIndicator(parseFloat(winProb), numPlayers);
                        console.log(`Progress: ${sim}/${simulations} simulations completed (${((sim/simulations)*100).toFixed(1)}%)`);
            }
            setTimeout(runSimulation, 0);
        } else {
            // Display final results
            const winProb = ((wins / simulations) * 100).toFixed(1);
            const tieProb = ((ties / simulations) * 100).toFixed(1);
            const lossProb = ((losses / simulations) * 100).toFixed(1);
            
            console.log(`Simulation complete! Total simulations run: ${sim}`);
            console.log(`Simulation details stored: ${simulationDetails.length}`);
            console.log(`Results: ${wins} wins, ${ties} ties, ${losses} losses`);
            
            document.getElementById('winProb').textContent = winProb + '%';
            document.getElementById('tieProb').textContent = tieProb + '%';
            document.getElementById('lossProb').textContent = lossProb + '%';
            document.getElementById('bestHand').textContent = currentBestHand ? currentBestHand.name : 'Incomplete Hand';
            
            // Update win indicator inline
            updateWinIndicator(parseFloat(winProb), numPlayers);
            
            isCalculating = false;
        }
    }
    
    runSimulation();
}

// Simulate random cards
function simulateRandomCards() {
    // Clear existing selections
    selectedHoleCards = [];
    selectedCommunityCards = [];
    selectedHoleRank = null;
    selectedCommunityRank = null;
    
    // Create a full deck
    const deck = createDeck();
    
    // Shuffle deck
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    
    // Select 2 random hole cards
    selectedHoleCards = [shuffled[0], shuffled[1]];
    
    // Always set to flop stage (3 community cards)
    setGamePhase('flop');
    
    // Select 3 community cards for flop
    selectedCommunityCards = shuffled.slice(2, 5);
    
    // Update display
    updateCardDisplay();
    updateRankButtonStates();
    hideError();
    
    // Trigger calculation
    autoCalculate();
}

// Open simulations modal
function openSimulationsModal() {
    document.getElementById('simulationsModal').classList.add('show');
    updateSimulationsDisplay();
}

// Close simulations modal
function closeSimulationsModal() {
    document.getElementById('simulationsModal').classList.remove('show');
}

// Update simulations display
function updateSimulationsDisplay() {
    const listDiv = document.getElementById('simulationList');
    
    if (simulationDetails.length === 0) {
        listDiv.innerHTML = '<div style="text-align: center; color: #b8c5a0; padding: 20px;">No simulations available yet. Run a calculation to see details.</div>';
        return;
    }
    
    console.log(`Displaying ${simulationDetails.length} simulations in modal`);
    
    listDiv.innerHTML = `<div style="text-align: center; color: #b8c5a0; padding: 10px; margin-bottom: 15px; border-bottom: 1px solid #2d7a4f;">
        Showing all ${simulationDetails.length} simulations<br>
        <small style="color: #8a9a7a;">For better viewing of all simulations, use the PDF export button</small>
    </div>` + simulationDetails.map((sim, index) => {
        const resultClass = sim.result === 'win' ? 'win' : sim.result === 'tie' ? 'tie' : 'loss';
        const resultText = sim.result === 'win' ? '✅ WIN' : sim.result === 'tie' ? '🤝 TIE' : '❌ LOSS';
        
        return `
            <div class="simulation-item">
                <div class="simulation-header">Simulation #${index + 1}</div>
                <div class="simulation-details">
                    <div><strong>Your Hand:</strong> ${sim.playerHand.name}</div>
                    <div><strong>Best Opponent Hand:</strong> ${sim.opponentHand.name}</div>
                    <div><strong>Community Cards:</strong> ${sim.communityCards.map(c => c.rank + c.suit).join(', ')}</div>
                </div>
                <div class="simulation-result ${resultClass}">${resultText}</div>
            </div>
        `;
    }).join('');
}

// Update win indicator (inline with results)
function updateWinIndicator(winPercent, numPlayers) {
    const indicatorValue = document.getElementById('winIndicatorValue');
    
    if (isNaN(winPercent) || winPercent === 0) {
        indicatorValue.textContent = '';
        return;
    }
    
    // Adjust thresholds based on number of players
    // Expected win rate = 100% / numPlayers
    // With more players, lower win rates are still good
    const expectedWinRate = 100 / numPlayers;
    
    // Thresholds adjusted for player count
    // Excellent: 1.8x expected (very strong)
    // Good: 1.4x expected (favorable)
    // Moderate: 1.0x expected (average)
    // Weak: below expected
    const excellentThreshold = expectedWinRate * 1.8;
    const goodThreshold = expectedWinRate * 1.4;
    const moderateThreshold = expectedWinRate * 1.0;
    
    if (winPercent >= excellentThreshold) {
        indicatorValue.style.color = '#66bb6a';
        indicatorValue.textContent = `🎯 Excellent`;
    } else if (winPercent >= goodThreshold) {
        indicatorValue.style.color = '#81c784';
        indicatorValue.textContent = `✅ Good`;
    } else if (winPercent >= moderateThreshold) {
        indicatorValue.style.color = '#ffd54f';
        indicatorValue.textContent = `⚠️ Moderate`;
    } else {
        indicatorValue.style.color = '#ef5350';
        indicatorValue.textContent = `❌ Weak`;
    }
}

// Convert card suit to text for PDF
function suitToText(suit) {
    const suitMap = {
        '♠': 'Spades',
        '♥': 'Hearts',
        '♦': 'Diamonds',
        '♣': 'Clubs'
    };
    return suitMap[suit] || suit;
}

// Format card for PDF display
function formatCardForPDF(card) {
    return `${card.rank} of ${suitToText(card.suit)}`;
}

// Export all simulations to PDF
function exportToPDF() {
    if (simulationDetails.length === 0) {
        showError('No simulations available to export');
        return;
    }
    
    console.log(`Exporting ${simulationDetails.length} simulations to PDF...`);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set up PDF styling
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const lineHeight = 7;
    let yPos = margin;
    
    // Add title
    doc.setFontSize(16);
    doc.text('Poker Simulation Results', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;
    
    // Add summary
    doc.setFontSize(10);
    doc.text(`Total Simulations: ${simulationDetails.length}`, margin, yPos);
    yPos += lineHeight;
    
    const wins = simulationDetails.filter(s => s.result === 'win').length;
    const ties = simulationDetails.filter(s => s.result === 'tie').length;
    const losses = simulationDetails.filter(s => s.result === 'loss').length;
    
    doc.text(`Wins: ${wins} (${((wins/simulationDetails.length)*100).toFixed(2)}%)`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Ties: ${ties} (${((ties/simulationDetails.length)*100).toFixed(2)}%)`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Losses: ${losses} (${((losses/simulationDetails.length)*100).toFixed(2)}%)`, margin, yPos);
    yPos += lineHeight * 2;
    
    // Add simulations
    doc.setFontSize(8);
    let simCount = 0;
    
    simulationDetails.forEach((sim, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
        }
        
        simCount++;
        const resultText = sim.result === 'win' ? 'WIN' : sim.result === 'tie' ? 'TIE' : 'LOSS';
        
        // Set color based on result
        if (sim.result === 'win') {
            doc.setTextColor(0, 150, 0);
        } else if (sim.result === 'tie') {
            doc.setTextColor(200, 150, 0);
        } else {
            doc.setTextColor(200, 0, 0);
        }
        
        // Simulation header
        doc.setFont(undefined, 'bold');
        doc.text(`Simulation #${simCount}: ${resultText}`, margin, yPos);
        yPos += lineHeight;
        
        // Reset color
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        
        // Simulation details
        doc.text(`Your Hand: ${sim.playerHand.name}`, margin + 5, yPos);
        yPos += lineHeight;
        doc.text(`Best Opponent Hand: ${sim.opponentHand.name}`, margin + 5, yPos);
        yPos += lineHeight;
        
        // Format community cards properly for PDF
        const communityCardsText = sim.communityCards.map(c => formatCardForPDF(c)).join(', ');
        // Split long lines if needed
        const maxWidth = pageWidth - margin * 2 - 10;
        const splitText = doc.splitTextToSize(`Community Cards: ${communityCardsText}`, maxWidth);
        doc.text(splitText, margin + 5, yPos);
        yPos += lineHeight * splitText.length;
        yPos += lineHeight * 0.5;
    });
    
    // Save PDF
    const fileName = `poker-simulations-${simulationDetails.length}-${Date.now()}.pdf`;
    doc.save(fileName);
    
    console.log(`PDF exported successfully with ${simCount} simulations`);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('simulationsModal');
    if (event.target === modal) {
        closeSimulationsModal();
    }
}

// Initialize on load
initCardSelection();
setGamePhase('preflop'); // Set initial phase

// Initial calculation
setTimeout(() => {
    calculateOdds();
}, 100);

