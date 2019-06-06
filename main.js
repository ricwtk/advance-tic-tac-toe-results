var app = new Vue({
  el: "#app",
  data: {
    main_player: "",
    game: {
      first_player: "",
      second_player: "",
      moves: [],
      result: {}
    },
    players: {},
    scores: {},
    scores_loaded: false,
    showing_scoreboard: false,
    showing_ranking: false,
    showing_team_list: false,
    score_hover_text: {
      p1: "",
      p2: ""
    },
    grid_size: 4,
    squares: Array(4*4).fill(-1),
    show_move: 0,
    auto_playback: false,
    playback_settings: {
      min: 10,
      max: 2000,
      value: 500
    },
    show_main_player_list: false,
    showing_time_complexity_ranking: false,
    time_test: {},
    time_test_players: ['circle-outline', 'close'],
    time_test_highlight_row_col: [-1, -1],
    time_state_highlight: -1
  },
  computed: {
    player_number: function () { return Object.keys(this.players).length; },
    player_keys_in_order: function () { 
      let plist = Object.keys(this.players); 
      plist.sort((a,b) => {
        let pa = this.players[a].name;
        let pb = this.players[b].name;
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      }); 
      return plist; 
    },
    time_ranked_players: function () {
      let plist = Object.keys(this.time_test.test_results);
      plist.sort((a,b) => {
        return this.time_test.test_results[a].total - this.time_test.test_results[b].total;
      });
      return plist;
    },
    ranking: function () {
      if (!this.scores_loaded) return {}
      let ranks = {};
      this.player_keys_in_order.forEach(
        p => 
        ranks[p] = {
          asFirst: { win: 0, loss: 0, tie: 0 },
          asSecond: { win: 0, loss: 0, tie: 0 },
          total: { win: 0, loss: 0, tie: 0 }
        }
      );
      this.player_keys_in_order.map(p => {
        let score = Object.keys(this.scores[p]).map(x => this.scores[p][x]);
        ranks[p].asFirst.tie = score.reduce((total, s) => s == 2 ? total+=1 : total, 0);
        ranks[p].asFirst.win = score.reduce((total, s) => s == 1 ? total+=1 : total, 0);
        ranks[p].asFirst.loss = score.reduce((total, s) => s == 0 ? total+=1 : total, 0);

        score = this.player_keys_in_order.map(x => {
          return this.scores[x][p];
        });
        ranks[p].asSecond.tie = score.reduce((total, s) => s == 2 ? total+=1 : total, 0);
        ranks[p].asSecond.loss = score.reduce((total, s) => s == 1 ? total+=1 : total, 0);
        ranks[p].asSecond.win = score.reduce((total, s) => s == 0 ? total+=1 : total, 0);

        ranks[p].total.win = ranks[p].asFirst.win + ranks[p].asSecond.win;
        ranks[p].total.loss = ranks[p].asFirst.loss + ranks[p].asSecond.loss;
        ranks[p].total.tie = ranks[p].asFirst.tie + ranks[p].asSecond.tie;
      });
      return ranks;
    },
    player_keys_in_rank: function () {
      let plist = Object.keys(this.ranking);
      plist.sort((a,b) => {
        let diffwin = this.ranking[b].total.win - this.ranking[a].total.win;
        let diffloss = this.ranking[a].total.loss - this.ranking[b].total.loss;
        let difftie = this.ranking[b].total.tie - this.ranking[a].total.tie;
        return diffwin == 0 ? diffloss == 0 ? difftie == 0 ? 0 : difftie : diffloss : diffwin;
      });
      return plist;
    }
  },
  watch: {
    show_move: function () {
      this.squares = Array(this.grid_size**2).fill(-1);
      if (this.game.moves.length > 0) {
        this.game.moves.forEach((m,i) => {
          if (i < this.show_move) this.$set(this.squares, m, i%2);
        });
      }
    },
    auto_playback: function () {
      if (this.auto_playback) this.playback();
    }
  },
  mounted: function () {
    this.getPlayers()
      .then(() => {
        return Promise.all(this.getScores())
      })
      .then(() => {
        console.log(this.scores);
        this.scores_loaded = true;
      });
    this.getTimeTest()
      .then(() => {
        console.log(this.time_test)
      });
  },
  methods: {
    getPlayers: function () {
      let req = new Request('./results/players.json');
      return fetch(req)
        .then(r => {
          if (r.status == 200) return r.json();
          else throw new Error('Error fetching player list')
        })
        .then(r => { this.players = r; })
        .catch(err => { console.error(err); });
    },
    getScores: function () {
      let player_modules = Object.keys(this.players);
      return player_modules.map((k, i) => {
        let p = this.players[k];
        let req = new Request(`./results/players/${p.module}.json`);
        return fetch(req)
          .then(r => {
            if (r.status == 200) return r.json();
            else throw new Error (`Error fetching scores for ${p.module}`)
          })
          .then(r => { 
            let row = {};
            r.forEach(x => {
              row[x.second_player] = x.result.tie ? 2 : x.result.win ? 1 : 0;
            });
            this.$set(this.scores, k, row); 
          })
          .catch(err => { console.error(err); });
      });
    },
    setScoreHover: function (m1, m2) {
      this.$set(this.score_hover_text, 'p1', m1);
      this.$set(this.score_hover_text, 'p2', m2);
    },
    showGame: function (m1, m2) {
      this.main_player = m1;
      this.setGame(m1, m2)
        .then(() => { this.showing_scoreboard = false; });
    },
    setGame: function (m1, m2) {
      let req = new Request(`./results/players/${m1}.json`);
      return fetch(req)
        .then(r => {
          if (r.status == 200) return r.json();
          else throw new Error (`Error fetching scores for ${m1}`);
        })
        .then(r => {
          let game = r.filter(x => x.second_player == m2);
          if (game.length > 0) {
            this.$set(this.game, 'first_player', m1);
            this.$set(this.game, 'second_player', m2);
            this.$set(this.game, 'moves', game[0].moves);
            this.$set(this.game, 'result', game[0].result);
          }
        })
        .catch(err => { console.error(err); });
    },
    playback: function () {
      if (this.auto_playback) {
        this.show_move += 1;
        if (this.show_move < this.game.moves.length) {
          return window.setTimeout(this.playback, parseInt(this.playback_settings.value,10));
        } else {
          this.auto_playback = false;
        }
      }
    },
    changeMainPlayer: function (m_player) {
      this.showGame(m_player, this.game.second_player != m_player ? this.game.second_player : this.player_keys_in_order[0] != m_player ? this.player_keys_in_order[0] : this.player_keys_in_order[1] );
    },
    getTimeTest: function () {
      let req = new Request('./results/timeresult.json');
      return fetch(req)
        .then(r => {
          if (r.status == 200) return r.json();
          else throw new Error('Error fetching time complexity result')
        })
        .then(r => { this.time_test = r; })
        .catch(err => { console.error(err); });
    }
  }
})