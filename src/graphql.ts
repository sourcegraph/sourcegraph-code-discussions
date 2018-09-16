import * as sourcegraph from 'sourcegraph'

export async function queryGraphQL(query: string, variables: any = {}): Promise<any> {
    return sourcegraph.commands.executeCommand<any>('queryGraphQL', query, variables)
}
