errors = require("./errors.js")
nanoid = require("nanoid")
fs = require("fs")
client = require("socket.io-client")("https://repltalk.jdaniels.tk")
https = require("https")
request = require("request")
function start(user, pass) {
  setInterval(function() {
    request.post({
      uri: "https://repl.it/login",
      json: { username: user, password: pass },
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Referrer": "https://repl.it"
      }
    }, (err, res, body) => {
      if (err) {
        errors.new(err)
      }
      if (body.username == undefined) {
        errors.new("Invalid information")
      }
      cookies = res.headers["set-cookie"]
    })
  }, 1000)
}
module.exports.Client = function() {
  this.on = function(thing, callback) {
    client.on(thing, callback)
  }
  this.login = function(info, _callback) {
    if (info == undefined) {
      errors.new("Info can't be undefined")
    }
    request.post({
      uri: "https://repl.it/login",
      json: { "username": info.username, "password": info.password },
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Referrer": "https://repl.it"
      }
    }, (err, res, abody) => {
      if (err) {
        errors.new("Repl-Talk Error: " + err)
        return
      }
      start(info.username, info.password)
      if (abody.username == info.username) {
        cookies = res.headers["set-cookie"]
        this.user = abody
        this.posts = {
          "create": function(title, body, boardId) {
            if (title == undefined) {
              errors.new("Title is undefined")
            } else if (body == undefined) {
              errors.new("Body is undefined")
            } else if (boardId == undefined) {
              errors.new("BoardId is undefined")
            }
            try {
              boardId = boardId.toLowerCase()
            }
            catch (err) {

            }
            /* If there is any board not on this list make sure to report at https://repltalk.jdaniels.tk/report */
            if (boardId == "challenge") {
              boardId = 16
            } else if (boardId == "ask") {
              boardId = 6
            } else if (boardId == "learn") {
              boardId = 17
            } else if (boardId == "announcements") {
              boardId = 14
            } else if (boardId == "share") {
              boardId = 6
            } else if (boardId == "moderator") {
              boardId = 21
            } else if (boardId == "product") {
              boardId = 20
            }
            request.post({
              uri: "https://repl.it/graphql",
              json: { query: `mutation createPost($input: CreatePostInput!){createPost(input: $input){post{url}}}`, variables: { input: { "title": title, "body": body, "boardId": boardId } } },
              headers: {
                "X-Requested-With": "XMLHttpRequest",
                "Referrer": "https://repl.it",
                "Cookie": cookies
              }
            }, (err, res, body) => {
              if (err) {
                errors.new("Repl-Talk Error: " + err)
                return
              }
              if (body.error != undefined) {
                for (x in body.error) {
                  errors.new(body.error[x].message)
                }
                return
              }
              lastCreatePost = 300000
              this.details = body.data.createPost.post
              if (__callback != undefined) {
                __callback(body.data.createPost.post)
              }
            })
          }
        }
        this.posts.get = function(postid, __callback) {
          if (postid == undefined) {
            errors.new("Please enter a post id")
          }
          request.post({
            uri: "https://repl.it/graphql",
            json: { query: `query{post(id: ${postid}){id title url isAuthor isLocked commentCount body isAnnouncement isAnswerable timeCreated canEdit canComment canPin canSetType canReport hasReported isLocked showHosted voteCount canVote hasVoted}}` },
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Referrer": "https://repl.it",
              "Cookie": cookies
            }
          }, (err, resp, body) => {
            if (err) {
              errors.new("Repl-Talk Error: " + err)
              return
            }
            if (body.errors != undefined) {
              for (x in body.errors) {
                errors.new("Error: " + body.errors[x].message)
              }
            }
            this.info = body.data.post
            this.upvote = function() {
              request.post({
                uri: "https://repl.it/graphql",
                json: { query: "mutation createPostVote($postId: Int!){createPostVote(postId: $postId){id}}", variables: { postId: this.info.id } },
                headers: {
                  "X-Requested-With": "XMLHttpRequest",
                  "Referrer": "https://repl.it",
                  "Cookie": cookies
                }
              }, (err, resp, body) => {
                if (err) {
                  errors.new("Unknown err: " + err)
                  return
                }
                for (x in body.errors) {
                  if (body)
                    errors.new(body.errors[x].message)
                }
              })
            }
            if (__callback != undefined) {
              __callback(this)
            }
          })
        }
        this.comments = {
          "create": function(postId, body, _callback) {
            if (postId == undefined) {
              errors.new("PostId can't be undefined")
            } else if (body == undefined) {
              errors.new("Body can't be undefined")
            }
            if (lastPostComment => 30000) {
              setTimeout(function() {
                //Do nothing
              }, 30000)
            }
            request.post({
              uri: "https://repl.it/graphql",
              json: { query: "mutation CreateComment($input: CreateCommentInput!){createComment(input: $input){comment{id}}}", variables: { input: { "postId": postId, "body": body } } },
              headers: {
                "X-Requested-With": "XMLHttpRequest",
                "Referrer": "https://repl.it",
                "Cookie": cookies
              }
            }, (err, res, body) => {
              if (err) {
                errors.new(err)
              }
              if (body.error != undefined) {
                for (x in body.error) {
                  errors.new(body.error[x].message)
                }
                return
              }
              lastPostComment = 30000
              this.details = body.data.createComment.comment
            })
          }
        }
        this.users = {}
        this.users.get = function(id, __callback) {
          if (id == undefined) {
            errors.new("Id can't be undefined")
            return
          }
          if (typeof id == "string") {
            request.post({
              uri: "https://repl.it/graphql",
              json: { query: `query{userByUsername(username: "${id}"){username id url image isHacker  isVerified timeCreated fullName displayName}}` },
              headers: {
                "X-Requested-With": "XMLHttpRequest",
                "Referrer": "https://repl.it"
              }
            }, (err, resp, body) => {
              if (err) {
                errors.new(err)
                return
              }
              if (body.error != undefined) {
                for (x in body.error) {
                  errors.new(body.error[x].message)
                }
                return
              }
              this.data = body.data.userByUsername
              if (__callback != undefined) {
                __callback(this.data)
              }
            })
            return
          }
          request.post({
            uri: "https://repl.it/graphql",
            json: { query: `query{user(id: ${id}){username id url image isHacker  isVerified timeCreated fullName displayName}}` },
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Referrer": "https://repl.it"
            }
          }, (err, resp, body) => {
            if (err) {
              errors.new(err)
              return
            }
            if (body.error != undefined) {
              for (x in body.error) {
                errors.new(body.error[x].message)
              }
              return
            }
            this.data = body.data.user
            if (__callback != undefined) {
              __callback(this.data)
            }
          })
        }
        if (_callback != undefined) {
          _callback()
        }
      }
    })
  }
}