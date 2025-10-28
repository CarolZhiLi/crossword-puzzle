import copy
import random
from request import request

class CrosswordGenerator:
    def __init__(self, words, grid_size=30):
        # Sort words from longest to shortest for higher success rate
        self.words = sorted(words, key=len, reverse=True)
        self.grid_size = grid_size
        self.grid = [['' for _ in range(grid_size)] for _ in range(grid_size)]
        self.solution_coordinates = []

    def solve(self):
        """Public method to start the solving process."""
        # The first word is placed specially to anchor the puzzle
        first_word = self.words[0]
        # Place horizontally near the center
        start_row = self.grid_size // 2
        start_col = (self.grid_size - len(first_word)) // 2
        
        # Place the first word
        for i, char in enumerate(first_word):
            self.grid[start_row][start_col + i] = char
        
        self.solution_coordinates.append((first_word, start_col, start_row, 'H'))
        
        # Recursively try to place the rest of the words
        return self._solve_recursive(self.words[1:])

    def _solve_recursive(self, words_to_place):
        """The core backtracking function."""
        if not words_to_place:
            return True # Base case: All words placed

        word = words_to_place[0]
        remaining_words = words_to_place[1:]
        
        # Find all possible valid placements for the current word
        placements = self._find_possible_placements(word)
        random.shuffle(placements) # Shuffle to get different results on each run

        for col, row, direction in placements:
            # 1. Choose: Place the word by making a snapshot
            snapshot = self._place_word(word, col, row, direction)
            self.solution_coordinates.append((word, col, row, direction))

            # 2. Explore: Recurse with the new state
            if self._solve_recursive(remaining_words):
                return True

            # 3. Backtrack: If recursion failed, undo the choice
            self._revert_placement(snapshot)
            self.solution_coordinates.pop()

        return False

    def _find_possible_placements(self, word):
        """Finds all valid (col, row, direction) for a given word by finding intersections."""
        placements = []
        for r_idx in range(self.grid_size):
            for c_idx in range(self.grid_size):
                # Check for potential intersections with existing letters
                if self.grid[r_idx][c_idx] != '':
                    for i, letter in enumerate(word):
                        if letter == self.grid[r_idx][c_idx]:
                            # Try placing horizontally
                            start_col, start_row = c_idx - i, r_idx
                            if self._can_place(word, start_col, start_row, 'H'):
                                placements.append((start_col, start_row, 'H'))
                            
                            # Try placing vertically
                            start_col, start_row = c_idx, r_idx - i
                            if self._can_place(word, start_col, start_row, 'V'):
                                placements.append((start_col, start_row, 'V'))
        return placements

    def _can_place(self, word, c, r, direction):
        """Checks if a word can be legally placed at a given location."""
        # 1. Bounds check
        if r < 0 or c < 0: return False
        
        if direction == 'H':
            if c + len(word) > self.grid_size: return False
            # Check for conflicts and adjacencies
            for i in range(len(word)):
                # If cell is occupied, it must match the letter at the intersection
                if self.grid[r][c+i] != '' and self.grid[r][c+i] != word[i]:
                    return False
                # If cell is empty, check neighbors
                if self.grid[r][c+i] == '':
                    if (r > 0 and self.grid[r-1][c+i] != '') or \
                       (r < self.grid_size-1 and self.grid[r+1][c+i] != ''):
                        return False
            # Check ends of the word
            if (c > 0 and self.grid[r][c-1] != '') or \
               (c + len(word) < self.grid_size and self.grid[r][c+len(word)] != ''):
                return False
        
        else: # Vertical
            if r + len(word) > self.grid_size: return False
            # Check for conflicts and adjacencies
            for i in range(len(word)):
                if self.grid[r+i][c] != '' and self.grid[r+i][c] != word[i]:
                    return False
                if self.grid[r+i][c] == '':
                    if (c > 0 and self.grid[r+i][c-1] != '') or \
                       (c < self.grid_size-1 and self.grid[r+i][c+1] != ''):
                        return False
            # Check ends of the word
            if (r > 0 and self.grid[r-1][c] != '') or \
               (r + len(word) < self.grid_size and self.grid[r+len(word)][c] != ''):
                return False
        return True

    def _place_word(self, word, c, r, direction):
        """Places a word on the grid and returns a snapshot for backtracking."""
        snapshot = []
        for i, char in enumerate(word):
            if direction == 'H':
                cur_c, cur_r = c + i, r
            else: # Vertical
                cur_c, cur_r = c, r + i
            
            original_char = self.grid[cur_r][cur_c]
            snapshot.append((cur_c, cur_r, original_char))
            self.grid[cur_r][cur_c] = char
        return snapshot
    
    def _revert_placement(self, snapshot):
        """Reverts a word placement using a snapshot."""
        for c, r, original_char in snapshot:
            self.grid[r][c] = original_char

    def print_grid(self):
        """Prints a cropped, readable version of the grid."""
        min_r, max_r, min_c, max_c = self.grid_size, -1, self.grid_size, -1
        for r in range(self.grid_size):
            for c in range(self.grid_size):
                if self.grid[r][c] != '':
                    min_r, max_r = min(min_r, r), max(max_r, r)
                    min_c, max_c = min(min_c, c), max(max_c, c)

        if max_r == -1: return

        print("--- Generated Crossword Grid ---")
        for r in range(min_r, max_r + 1):
            for c in range(min_c, max_c + 1):
                char = self.grid[r][c]
                print(char if char else '#', end=' ')
            print()

# --- Main execution block ---
if __name__ == "__main__":
    results = request("Generate 20 one-word terms related to JavaScript. Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description.")
    words = [w.upper() for _,w, _ in results]  # Convert to uppercase immediately
    print(f"Attempting to generate a crossword with {len(words)} words...")
    generator = CrosswordGenerator(words)

    if generator.solve():
        print("\n✅ Solution Found!\n")
        generator.print_grid()        
        print(f"\n--- Words Successfully Used in Grid ---")
        used_words = [word for word, _, _, _ in generator.solution_coordinates]
        print(f"Total words placed: {len(used_words)}/{len(words)}")
        print("Used words:")
        for i, word in enumerate(sorted(set(used_words)), 1):
            print(f"{i:2d}. {word}")
        
        print(f"\n--- Words NOT Used ---")
        unused_words = set(words) - set(used_words)
        if unused_words:
            for i, word in enumerate(sorted(unused_words), 1):
                print(f"{i:2d}. {word}")
        else:
            print("All words were successfully used!")
            
    else:
        print("\nNo solution could be found for the given words.")
        print(f"Words placed: {len(generator.solution_coordinates)}/{len(words)}")
        
        if len(generator.solution_coordinates) > 0:
            used_words = [word for word, _, _, _ in generator.solution_coordinates]
            print(f"\n--- Words Successfully Placed ---")
            for i, word in enumerate(sorted(set(used_words)), 1):
                print(f"{i:2d}. {word}")
        
        print(f"\n--- Words NOT Used ---")
        used_words = [word for word, _, _, _ in generator.solution_coordinates]
        unused_words = set(words) - set(used_words)
        if unused_words:
            for i, word in enumerate(sorted(unused_words), 1):
                print(f"{i:2d}. {word}")
        else:
            print("All words were successfully used!")