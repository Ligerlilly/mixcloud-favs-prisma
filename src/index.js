const { GraphQLServer } = require('graphql-yoga')
const { Prisma } = require('prisma-binding')
const fetch = require('node-fetch')

const getFeed = async (username) => {
	let feed = []
	await fetch(`https://api.mixcloud.com/${username}/cloudcasts`)
		.then((resp) => resp.json())
		.then(async (json) => {
			feed = await transformFeedData(json)
		})

	return feed
}

const transformFeedData = (json) => {
	return json.data.reduce((acc, cloudcast) => {

		return cloudcast
			? [
					...acc,
					{
						url: cloudcast ? cloudcast.url : '',
						title: cloudcast ? cloudcast.name : '',
						created_time: cloudcast ? cloudcast.created_time : '',
                        key: cloudcast ? cloudcast.key : '',
                        embedUrl: cloudcast ? getEmbedString(cloudcast) : '',
                        id: "someId"
					},
				]
			: acc
	}, [])
}

const getEmbedString = async (cloudcast) => {
    let url
    await fetch(`https://api.mixcloud.com${cloudcast.key}embed-json/`)
        .then(resp => resp.json())
        .then(async (json) => {
            url = json.html
        })
    return url
}

const test = async (args, context, info) => {
    const djInfo = await fetch(`https://api.mixcloud.com/${args.data.username}`)
    .then((resp) => resp.json())

    return context.prisma.mutation.createDJ({data: {
        display_name: djInfo.name,
        feed_url: `https://api.mixcloud.com/${args.data.username}/feed`,
        username: args.data.username,
    }}, info)
}


const resolvers = {
  Query: {
    cloudCasts: (_, args, context, info) => {
      return getFeed(args.username)
    },
    dJs: (_, args, context, info) => {
        return context.prisma.query.dJs({}, info)
      },
  },
  Mutation: {
      createDJ: (_, args, context, info) => {
        return test(args, context, info)
      },
      deleteDJ: (_, args, context, info) => {
        return context.prisma.mutation.deleteDJ({}, info,)
      },
  }
}

const server = new GraphQLServer({
  typeDefs: 'src/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    prisma: new Prisma({
      typeDefs: 'src/generated/prisma.graphql',
      endpoint: 'http://localhost:4466',
    }),
  }),
})
server.start(() => console.log(`GraphQL server is running on http://localhost:4000`))