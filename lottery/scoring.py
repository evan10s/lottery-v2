from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

@dataclass
class PlayerAggregatedResult:
    barcode: str
    sum_ranking_points: int
    tiebreaker_score: float
    is_disqualified: bool
    ranks_by_game: Dict[str, int]

@dataclass
class GameResult:
    barcode: str
    percent_correct: float
    num_earned: float
    num_possible: float
    points_earned_ratio: float # Points earned for this game / total points earned for all games
    is_disqualified: bool

@dataclass
class GameRanking:
    barcode: str
    ranking_points: int
    game_name: str
    rank: int
    tiebreaker_value: float # Amount this game's ranking result contributes to the player's overall tiebreaker score
    is_disqualified: bool

@dataclass
class DrawingResults:
    ranking_system: str
    overall_results: List[Any]
    lottery_results: Optional[List[Any]]
    scratchoff_results: Optional[List[Any]]

DEFAULT_RANK_BONUS = {
    1: 1,
}

def compute_ranking_points(game_result: GameResult, rank: int, num_entries: int, bonuses: Dict[int, int]) -> int:
    """
    Compute the ranking points for a given game result.

    If the player is disqualified, returns 0.
    Otherwise, returns the rank + rank bonus, if applicable.

    Args:
        game_result (GameResult): The game result to compute ranking points for.
        rank (int): The one-indexed rank of the player in the game.

    Returns:
        int: The number of ranking points the player has earned.
    """
    if game_result.is_disqualified:
        return 0

    print(f"gameresult: {game_result} | rank: {rank} | num_entries: {num_entries} | bonuses: {bonuses}")
    rank_points = num_entries - rank + 1
    rank_bonus = bonuses.get(rank, 0)
    return rank_points + rank_bonus

def compute_tiebreaker_value(points_earned_ratio: float, percent_correct: float):
    """Compute the tiebreaker value for a game result, according to the formula:

    Total tiebreaker value = max[for all games](percent_correct)

    If the player result is disqualified, returns -1.

    Args:
        points_earned_ratio (float): Percent of points the player earned from this game
        percent_correct (float): Player's percent correct score for this game
    """
    return percent_correct / 100

def generate_game_rankings(
        game_name: str,
        game_results: List[GameResult],
        ranking_bonuses: Dict[int, int] = DEFAULT_RANK_BONUS
    ) -> List[GameRanking]:
    """
    Ranks GameResults objects for a particular game within a lottery, using "Mario Kart" ranking points scoring.

    Args:
        game_name (str): The name of the game to rank results for
        game_results (List[GameResult]): A list of game results to sort
        ranking_bonuses (Dict[int, int], optional): A map of rank -> bonus points, defining the bonus points given
            to particular ranks. Defaults to the DEFAULT_RANK_BONUS dict in this file.

    Returns:
        List[GameRanking]: _description_
    """
    game_results_sorted = sorted(
        game_results,
        key=lambda x: (not x.is_disqualified, x.percent_correct, x.num_possible),
        reverse=True
    )

    game_rankings = [
        GameRanking(
            barcode=result.barcode,
            game_name=game_name,
            rank=idx + 1,
            ranking_points=compute_ranking_points(
                result,
                rank=idx + 1,
                num_entries=len(game_results_sorted),
                bonuses=ranking_bonuses,
            ),
            tiebreaker_value=compute_tiebreaker_value(result.points_earned_ratio, result.percent_correct),
            is_disqualified=result.is_disqualified,
        )
        for idx, result in enumerate(game_results_sorted)
    ]

    return sorted(game_rankings, key=lambda x: (x.ranking_points), reverse=True)

def generate_aggregated_results(
        lottery_results: List[GameRanking],
        scratchoff_results: List[GameRanking],
):
    results = defaultdict(list)
    combined_results = lottery_results + scratchoff_results
    for result in combined_results:
        results[result.barcode].append(result)

    aggregated_results = dict()

    for barcode, results in results.items():
        aggregated_results[barcode] = PlayerAggregatedResult(
            barcode=barcode,
            sum_ranking_points=sum(result.ranking_points for result in results),
            tiebreaker_score=max(result.tiebreaker_value for result in results),
            is_disqualified=any(result.is_disqualified for result in results),
            ranks_by_game={result.game_name: result.rank for result in results}
        )

    return sorted(aggregated_results.values(), key=lambda x: (x.sum_ranking_points, x.tiebreaker_score), reverse=True)
