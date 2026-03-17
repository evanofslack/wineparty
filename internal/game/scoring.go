package game

import (
	"math"
	"sort"
	"strings"
)

const (
	pointsVariety   = 3
	pointsCountry   = 1
	pointsRegion    = 2
	pointsYearExact = 3
	pointsYearOne   = 2
	pointsYearTwo   = 1
	pointsFlavor    = 1
	maxFlavors      = 3
)

func ScoreGuess(g Guess, wine WineConfig) RoundScore {
	rs := RoundScore{
		PlayerID:   g.PlayerID,
		RoundIndex: g.RoundIndex,
	}

	if strings.EqualFold(strings.TrimSpace(g.Variety), strings.TrimSpace(wine.Variety)) {
		rs.VarietyHit = true
		rs.Points += pointsVariety
	}

	if wine.Country != "" && strings.EqualFold(strings.TrimSpace(g.Country), strings.TrimSpace(wine.Country)) {
		rs.CountryHit = true
		rs.CountryPoints = pointsCountry
		rs.Points += rs.CountryPoints
	}

	if strings.EqualFold(strings.TrimSpace(g.Region), strings.TrimSpace(wine.Region)) {
		rs.RegionHit = true
		rs.Points += pointsRegion
	}

	diff := int(math.Abs(float64(g.Year - wine.Year)))
	switch {
	case diff == 0:
		rs.YearPoints = pointsYearExact
	case diff == 1:
		rs.YearPoints = pointsYearOne
	case diff == 2:
		rs.YearPoints = pointsYearTwo
	}
	rs.Points += rs.YearPoints

	flavors := g.Flavors
	if len(flavors) > maxFlavors {
		flavors = flavors[:maxFlavors]
	}
	rs.FlavorPoints = len(flavors) * pointsFlavor
	rs.Points += rs.FlavorPoints

	return rs
}

func computeSummary(state *GameState) (*GameSummary, map[string]*PlayerSummary) {
	wineRatings := make([]WineRatingSummary, len(state.Rounds))
	for i, round := range state.Rounds {
		var sum float64
		var count int
		ratings := make([]float64, 0, len(round.Guesses))
		for _, g := range round.Guesses {
			if g.Rating > 0 {
				sum += float64(g.Rating)
				count++
				ratings = append(ratings, float64(g.Rating))
			}
		}
		wrs := WineRatingSummary{
			RoundIndex:  i,
			WineName:    round.Wine.Name,
			WineVariety: round.Wine.Variety,
			RatedCount:  count,
		}
		if count > 0 {
			wrs.AvgRating = sum / float64(count)
		}
		if count >= 2 {
			var variance float64
			for _, r := range ratings {
				d := r - wrs.AvgRating
				variance += d * d
			}
			wrs.Variance = variance / float64(count)
		}
		wineRatings[i] = wrs
	}

	summary := &GameSummary{WineRatings: wineRatings}
	for i := range wineRatings {
		wrs := wineRatings[i]
		if wrs.RatedCount >= 1 {
			if summary.MostPopular == nil || wrs.AvgRating > summary.MostPopular.AvgRating {
				cp := wrs
				summary.MostPopular = &cp
			}
			if summary.LeastLiked == nil || wrs.AvgRating < summary.LeastLiked.AvgRating {
				cp := wrs
				summary.LeastLiked = &cp
			}
		}
		if wrs.RatedCount >= 2 {
			if summary.MostContested == nil || wrs.Variance > summary.MostContested.Variance {
				cp := wrs
				summary.MostContested = &cp
			}
		}
	}

	playerSummaries := make(map[string]*PlayerSummary)
	for _, p := range state.Players {
		if p.Role == RoleAdmin {
			continue
		}
		ps := &PlayerSummary{PlayerID: p.ID}
		var favRating int
		var favFound bool
		var totalRating int
		var ratingCount int

		for i, round := range state.Rounds {
			var g *Guess
			for j := range round.Guesses {
				if round.Guesses[j].PlayerID == p.ID {
					g = &round.Guesses[j]
					break
				}
			}
			if g != nil {
				ps.RoundsPlayed++
				if g.Rating > 0 {
					totalRating += g.Rating
					ratingCount++
					if !favFound || g.Rating > favRating {
						favRating = g.Rating
						ps.FavoriteWine = round.Wine.Name
						ps.FavoriteWineVariety = round.Wine.Variety
						ps.FavoriteWineRound = i
						favFound = true
					}
				}
			}
			for _, rs := range round.Scores {
				if rs.PlayerID == p.ID {
					if rs.Points > ps.BestRoundPoints {
						ps.BestRoundPoints = rs.Points
						ps.BestRound = i
					}
					if rs.VarietyHit {
						ps.VarietyHits++
					}
					ps.TotalYearPoints += rs.YearPoints
					break
				}
			}
		}
		if ratingCount > 0 {
			ps.AvgRatingGiven = float64(totalRating) / float64(ratingCount)
		}
		playerSummaries[p.ID] = ps
	}

	return summary, playerSummaries
}

func BuildLeaderboard(players map[string]*Player) []LeaderboardEntry {
	entries := make([]LeaderboardEntry, 0, len(players))
	for _, p := range players {
		if p.Role == RoleAdmin {
			continue
		}
		entries = append(entries, LeaderboardEntry{
			PlayerID:   p.ID,
			PlayerName: p.Name,
			Score:      p.TotalScore,
		})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Score > entries[j].Score
	})
	for i := range entries {
		entries[i].Rank = i + 1
	}
	return entries
}
