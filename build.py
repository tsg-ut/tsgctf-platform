from ecs_composex.ecs_composex import generate_full_template
from ecs_composex.common.settings import ComposeXSettings
from ecs_composex.common.stacks import process_stacks
import json
import yaml

settings = ComposeXSettings(
  command='render',
  DockerComposeXFile=['tsgctf-test-crypto/docker-compose.yml'],
  Name='tsgctf-test-crypto',
)
root_stack = generate_full_template(settings)
process_stacks(root_stack, settings)
print(root_stack.TemplateURL)
app_stack = root_stack.stack_template.resources['app']
print(app_stack.TemplateURL)

with open(app_stack.TemplateURL, 'r') as f:
  app_stack_template = json.load(f)

task_definition = app_stack_template['Resources']['EcsTaskDefinition']
task_definition_yaml = yaml.dump(task_definition, sort_keys=False)
print(task_definition_yaml)