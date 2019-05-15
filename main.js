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
    showing_scoreboard: false,
    score_hover_text: {
      p1: "",
      p2: ""
    }
  },
  computed: {
    player_number: function () { return Object.keys(this.players).length; },
    player_keys_in_order: function () { let plist = Object.keys(this.players); plist.sort(); return plist; }
  },
  mounted: function () {
    this.getPlayers()
      .then(() => {
        return Promise.all(this.getScores())
      })
      .then(() => {
        console.log(this.scores);
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
    }
  }
})