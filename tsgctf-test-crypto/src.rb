STDOUT.sync = true

x = rand(1..100)
y = rand(1..100)

answer = x + y

print "#{x} + #{y} = ? "

response = gets.chomp.to_i

if response == answer
  puts "Correct! Flag is #{ENV['FLAG']}"
else
  puts "Wrong!"
end